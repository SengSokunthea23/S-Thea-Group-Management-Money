import { parseDateInput, toIsoDate, toUtcDate } from "@/lib/date";
import type { Translator } from "@/lib/i18n/translate";

// SQLite has no native enum type, so every classification below is stored as a
// String and constrained here. This module is the single source of truth for
// the ledger's vocabulary — nothing else should hardcode one of these strings.

// --- entry types --------------------------------------------------------

/**
 * The three flows the dashboard studies. Savings is deliberately its own type
 * rather than a derived `income - expenses`: money you *meant* to set aside is
 * a different fact from money that merely happened to be left over, and only
 * the first one answers "am I saving?".
 */
export const ENTRY_TYPES = ["INCOME", "EXPENSE", "SAVING"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export const ENTRY_TYPE_STYLES: Record<EntryType, string> = {
  INCOME: "badge badge-emerald",
  EXPENSE: "badge badge-rose",
  SAVING: "badge badge-indigo",
};

export function isEntryType(value: unknown): value is EntryType {
  return ENTRY_TYPES.includes(value as EntryType);
}

/** Falls back to EXPENSE so an unexpected DB value renders instead of crashing. */
export function toEntryType(value: string): EntryType {
  return isEntryType(value) ? value : "EXPENSE";
}

export function entryTypeLabel(t: Translator, type: EntryType): string {
  return t(`entries.type.${type}`);
}

// --- expense categories -------------------------------------------------

export const EXPENSE_CATEGORIES = [
  "HOUSING",
  "FOOD",
  "TRANSPORT",
  "UTILITIES",
  "HEALTH",
  "EDUCATION",
  "LEISURE",
  "DEBT",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

// --- savings buckets ----------------------------------------------------

export const SAVING_BUCKETS = [
  "EMERGENCY",
  "INVESTMENT",
  "GOAL",
  "RETIREMENT",
  "OTHER",
] as const;

export type SavingBucket = (typeof SAVING_BUCKETS)[number];

/**
 * Which vocabulary `Entry.category` draws on depends on `Entry.type`. Income is
 * absent on purpose: an income line is classified by *where it came from*, which
 * is the source relation, not a free-standing category.
 */
export function categoriesFor(type: EntryType): readonly string[] {
  if (type === "EXPENSE") return EXPENSE_CATEGORIES;
  if (type === "SAVING") return SAVING_BUCKETS;
  return [];
}

export function isValidCategory(type: EntryType, value: string): boolean {
  return categoriesFor(type).includes(value);
}

export function categoryLabel(
  t: Translator,
  type: EntryType,
  category: string | null,
): string {
  if (!category) return t("common.empty");
  if (!isValidCategory(type, category)) return category;

  return type === "EXPENSE"
    ? t(`entries.expenseCategory.${category as ExpenseCategory}`)
    : t(`entries.savingBucket.${category as SavingBucket}`);
}

// --- income sources -----------------------------------------------------

export const SOURCE_KINDS = [
  "SALARY",
  "BUSINESS",
  "FREELANCE",
  "INVESTMENT",
  "RENTAL",
  "OTHER",
] as const;

export type SourceKind = (typeof SOURCE_KINDS)[number];

export const SOURCE_KIND_STYLES: Record<SourceKind, string> = {
  SALARY: "badge badge-indigo",
  BUSINESS: "badge badge-emerald",
  FREELANCE: "badge badge-amber",
  INVESTMENT: "badge badge-emerald",
  RENTAL: "badge badge-neutral",
  OTHER: "badge badge-neutral",
};

export function isSourceKind(value: unknown): value is SourceKind {
  return SOURCE_KINDS.includes(value as SourceKind);
}

export function toSourceKind(value: string): SourceKind {
  return isSourceKind(value) ? value : "OTHER";
}

export function sourceKindLabel(t: Translator, kind: SourceKind): string {
  return t(`sources.kind.${kind}`);
}

// --- serialisable shapes ------------------------------------------------
// Plain objects passed from server components into client ones. Deliberately
// not the Prisma model types — that keeps client bundles free of Prisma.

export type EntryRecord = {
  id: string;
  type: string;
  amountCents: number;
  occurredOn: string; // ISO date, "YYYY-MM-DD"
  category: string | null;
  note: string | null;
  sourceId: string | null;
  sourceName: string | null;
};

export type SourceRecord = {
  id: string;
  name: string;
  kind: string;
  active: boolean;
  note: string | null;
  /** Lifetime income booked against this source, for the Sources table. */
  totalCents: number;
  entryCount: number;
};

/** The subset the entry drawer needs to populate its source picker. */
export type SourceOption = { id: string; name: string; kind: string };

export { toIsoDate, toUtcDate };

// --- money --------------------------------------------------------------

/**
 * Accepts what people actually type — "1200", "$1,200", "45.50" — and returns
 * integer cents. Rounds rather than truncates so 0.015 doesn't vanish.
 */
export function parseMoneyToCents(raw: string): number | null {
  const cleaned = raw.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;

  const amount = Number(cleaned);
  if (!Number.isFinite(amount)) return null;

  return Math.round(amount * 100);
}

// --- entry validation ---------------------------------------------------

export type EntryField =
  | "type"
  | "amount"
  | "occurredOn"
  | "category"
  | "sourceId"
  | "note";

export type EntryFieldErrors = Partial<Record<EntryField, string>>;

export type EntryInput = {
  type: EntryType;
  amountCents: number;
  occurredOn: Date;
  category: string | null;
  sourceId: string | null;
  note: string | null;
};

export type EntryParseResult =
  | { ok: true; data: EntryInput }
  | { ok: false; fieldErrors: EntryFieldErrors };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/** Optional fields collapse an empty string to null so the DB stays clean. */
function optional(value: string): string | null {
  return value.length > 0 ? value : null;
}

/** `t` is threaded in so validation messages come from the active locale. */
export function parseEntryInput(
  formData: FormData,
  t: Translator,
): EntryParseResult {
  const rawType = text(formData, "type");
  const amount = text(formData, "amount");
  const occurredOn = text(formData, "occurredOn");
  const category = text(formData, "category");
  const sourceId = text(formData, "sourceId");
  const note = text(formData, "note");

  const fieldErrors: EntryFieldErrors = {};

  if (!isEntryType(rawType)) {
    // Nothing below can be judged without knowing the flow, so this one stops
    // the parse rather than accumulating alongside other errors.
    return { ok: false, fieldErrors: { type: t("entries.errors.typeInvalid") } };
  }
  const type = rawType;

  const amountCents = amount ? parseMoneyToCents(amount) : null;
  if (amountCents === null) {
    fieldErrors.amount = t("entries.errors.amountInvalid");
  } else if (amountCents <= 0) {
    fieldErrors.amount = t("entries.errors.amountPositive");
  } else if (amountCents > 1_000_000_000_00) {
    fieldErrors.amount = t("entries.errors.amountTooLarge");
  }

  let date: Date | null = null;
  if (!occurredOn) {
    fieldErrors.occurredOn = t("entries.errors.dateRequired");
  } else {
    // Accepts dd/mm/yyyy as typed, and ISO for anything stored or pasted.
    const iso = parseDateInput(occurredOn);
    if (!iso) {
      fieldErrors.occurredOn = t("entries.errors.dateInvalid");
    } else {
      date = toUtcDate(iso);
    }
  }

  // Income is classified by source; expenses and savings by category. Each
  // branch also clears the other's field so a value left behind by switching
  // the type in the drawer is never persisted.
  let resolvedCategory: string | null = null;
  let resolvedSourceId: string | null = null;

  if (type === "INCOME") {
    if (!sourceId) {
      fieldErrors.sourceId = t("entries.errors.sourceRequired");
    } else {
      resolvedSourceId = sourceId;
    }
  } else if (!category) {
    fieldErrors.category = t("entries.errors.categoryRequired");
  } else if (!isValidCategory(type, category)) {
    fieldErrors.category = t("entries.errors.categoryInvalid");
  } else {
    resolvedCategory = category;
  }

  if (note.length > 280) {
    fieldErrors.note = t("entries.errors.noteTooLong");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      type,
      amountCents: amountCents as number,
      occurredOn: date as Date,
      category: resolvedCategory,
      sourceId: resolvedSourceId,
      note: optional(note),
    },
  };
}

// --- source validation --------------------------------------------------

export type SourceField = "name" | "kind" | "note";

export type SourceFieldErrors = Partial<Record<SourceField, string>>;

export type SourceInput = {
  name: string;
  kind: SourceKind;
  active: boolean;
  note: string | null;
};

export type SourceParseResult =
  | { ok: true; data: SourceInput }
  | { ok: false; fieldErrors: SourceFieldErrors };

export function parseSourceInput(
  formData: FormData,
  t: Translator,
): SourceParseResult {
  const name = text(formData, "name");
  const kind = text(formData, "kind");
  const note = text(formData, "note");
  const active = formData.get("active") !== null;

  const fieldErrors: SourceFieldErrors = {};

  if (!name) {
    fieldErrors.name = t("sources.errors.nameRequired");
  } else if (name.length > 80) {
    fieldErrors.name = t("sources.errors.nameTooLong");
  }

  if (!isSourceKind(kind)) {
    fieldErrors.kind = t("sources.errors.kindInvalid");
  }

  if (note.length > 280) {
    fieldErrors.note = t("sources.errors.noteTooLong");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: { name, kind: kind as SourceKind, active, note: optional(note) },
  };
}
