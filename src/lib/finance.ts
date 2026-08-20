import { parseDateInput, toIsoDate, toUtcDate } from "@/lib/date";
import {
  isCategoryTone,
  isPaymentMethod,
  type AttachmentRecord,
} from "@/lib/expense";
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

// Expense categories are no longer a list here. They are rows the user owns —
// see ExpenseCategory in the schema, and DEFAULT_EXPENSE_CATEGORIES in
// src/lib/expense.ts for the set a new account starts with.

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
 * `Entry.category` now holds savings buckets only.
 *
 * Expenses moved to a relation when categories became user-defined — see
 * ExpenseCategory in the schema — and income has always been classified by its
 * source. A bucket stays a fixed vocabulary because "emergency fund" means the
 * same thing to everyone, which is exactly what is not true of "Leisure".
 */
export function categoriesFor(type: EntryType): readonly string[] {
  return type === "SAVING" ? SAVING_BUCKETS : [];
}

export function isValidCategory(type: EntryType, value: string): boolean {
  return categoriesFor(type).includes(value);
}

/** Savings bucket name. Expense categories carry their own text on the row. */
export function bucketLabel(t: Translator, bucket: string | null): string {
  if (!bucket) return t("common.empty");
  if (!isValidCategory("SAVING", bucket)) return bucket;
  return t(`entries.savingBucket.${bucket as SavingBucket}`);
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
  /** Savings bucket. Null for income and expenses. */
  category: string | null;
  note: string | null;
  sourceId: string | null;
  sourceName: string | null;

  // Expenses only.
  categoryId: string | null;
  categoryName: string | null;
  categoryTone: string | null;
  merchant: string | null;
  paymentMethod: string | null;
  /** Non-null when the entry was posted from a recurring template. */
  recurringId: string | null;
  attachments: AttachmentRecord[];
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
export type { AttachmentRecord };

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
  | "categoryId"
  | "sourceId"
  | "merchant"
  | "paymentMethod"
  | "note"
  | "attachments";

export type EntryFieldErrors = Partial<Record<EntryField, string>>;

export type EntryInput = {
  type: EntryType;
  amountCents: number;
  occurredOn: Date;
  /** Savings bucket, or null. */
  category: string | null;
  sourceId: string | null;
  categoryId: string | null;
  merchant: string | null;
  paymentMethod: string | null;
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
  const categoryId = text(formData, "categoryId");
  const merchant = text(formData, "merchant");
  const paymentMethod = text(formData, "paymentMethod");
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

  /*
    Each flow is classified differently, and each branch clears the other two's
    fields. That matters because the drawer lets you switch type mid-edit: a
    category picked while it said Expense must not ride along once it says
    Income, or the entry would carry a classification that contradicts it.

      INCOME   → sourceId       (which source paid you)
      EXPENSE  → categoryId     (a row the user owns; existence checked by the
                                 action, which is the only place that knows who
                                 is asking)
      SAVING   → category       (a fixed bucket, validated right here)
  */
  let resolvedCategory: string | null = null;
  let resolvedSourceId: string | null = null;
  let resolvedCategoryId: string | null = null;
  let resolvedMerchant: string | null = null;
  let resolvedPaymentMethod: string | null = null;

  if (type === "INCOME") {
    if (!sourceId) {
      fieldErrors.sourceId = t("entries.errors.sourceRequired");
    } else {
      resolvedSourceId = sourceId;
    }
  } else if (type === "EXPENSE") {
    if (!categoryId) {
      fieldErrors.categoryId = t("entries.errors.categoryRequired");
    } else {
      resolvedCategoryId = categoryId;
    }

    if (merchant.length > 120) {
      fieldErrors.merchant = t("entries.errors.merchantTooLong");
    } else {
      resolvedMerchant = optional(merchant);
    }

    // Blank is allowed — not everyone tracks how they paid.
    if (paymentMethod && !isPaymentMethod(paymentMethod)) {
      fieldErrors.paymentMethod = t("entries.errors.paymentMethodInvalid");
    } else {
      resolvedPaymentMethod = optional(paymentMethod);
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
      categoryId: resolvedCategoryId,
      merchant: resolvedMerchant,
      paymentMethod: resolvedPaymentMethod,
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

// --- expense category validation ----------------------------------------

export type CategoryField = "name" | "budget" | "tone";

export type CategoryFieldErrors = Partial<Record<CategoryField, string>>;

export type CategoryInput = {
  name: string;
  budgetCents: number | null;
  tone: string;
  active: boolean;
};

export type CategoryParseResult =
  | { ok: true; data: CategoryInput }
  | { ok: false; fieldErrors: CategoryFieldErrors };

export function parseCategoryInput(
  formData: FormData,
  t: Translator,
): CategoryParseResult {
  const name = text(formData, "name");
  const budget = text(formData, "budget");
  const tone = text(formData, "tone");
  const active = formData.get("active") !== null;

  const fieldErrors: CategoryFieldErrors = {};

  if (!name) {
    fieldErrors.name = t("categories.errors.nameRequired");
  } else if (name.length > 60) {
    fieldErrors.name = t("categories.errors.nameTooLong");
  }

  // Empty means "track it, don't cap it" — deliberately distinct from 0, which
  // would be a budget of nothing.
  let budgetCents: number | null = null;
  if (budget) {
    const parsed = parseMoneyToCents(budget);
    if (parsed === null) {
      fieldErrors.budget = t("categories.errors.budgetInvalid");
    } else if (parsed <= 0) {
      fieldErrors.budget = t("categories.errors.budgetPositive");
    } else if (parsed > 1_000_000_000_00) {
      fieldErrors.budget = t("entries.errors.amountTooLarge");
    } else {
      budgetCents = parsed;
    }
  }

  if (!isCategoryTone(tone)) {
    fieldErrors.tone = t("categories.errors.toneInvalid");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: { name, budgetCents, tone, active } };
}

// --- recurring expense validation ---------------------------------------

export type RecurringField =
  | "amount"
  | "categoryId"
  | "dayOfMonth"
  | "merchant"
  | "paymentMethod"
  | "note"
  | "startsOn";

export type RecurringFieldErrors = Partial<Record<RecurringField, string>>;

export type RecurringInput = {
  amountCents: number;
  categoryId: string;
  dayOfMonth: number;
  merchant: string | null;
  paymentMethod: string | null;
  note: string | null;
  startsOn: Date;
  active: boolean;
};

export type RecurringParseResult =
  | { ok: true; data: RecurringInput }
  | { ok: false; fieldErrors: RecurringFieldErrors };

export function parseRecurringInput(
  formData: FormData,
  t: Translator,
): RecurringParseResult {
  const amount = text(formData, "amount");
  const categoryId = text(formData, "categoryId");
  const dayOfMonth = text(formData, "dayOfMonth");
  const merchant = text(formData, "merchant");
  const paymentMethod = text(formData, "paymentMethod");
  const note = text(formData, "note");
  const startsOn = text(formData, "startsOn");
  const active = formData.get("active") !== null;

  const fieldErrors: RecurringFieldErrors = {};

  const amountCents = amount ? parseMoneyToCents(amount) : null;
  if (amountCents === null) {
    fieldErrors.amount = t("entries.errors.amountInvalid");
  } else if (amountCents <= 0) {
    fieldErrors.amount = t("entries.errors.amountPositive");
  } else if (amountCents > 1_000_000_000_00) {
    fieldErrors.amount = t("entries.errors.amountTooLarge");
  }

  if (!categoryId) {
    fieldErrors.categoryId = t("entries.errors.categoryRequired");
  }

  // Days beyond a month's length are kept rather than rejected: "the 31st"
  // means "the last day" to most people, and clampDayToMonth honours that.
  const day = Number(dayOfMonth);
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    fieldErrors.dayOfMonth = t("recurring.errors.dayInvalid");
  }

  if (merchant.length > 120) {
    fieldErrors.merchant = t("entries.errors.merchantTooLong");
  }

  if (paymentMethod && !isPaymentMethod(paymentMethod)) {
    fieldErrors.paymentMethod = t("entries.errors.paymentMethodInvalid");
  }

  if (note.length > 280) {
    fieldErrors.note = t("entries.errors.noteTooLong");
  }

  let start: Date | null = null;
  if (!startsOn) {
    fieldErrors.startsOn = t("entries.errors.dateRequired");
  } else {
    const iso = parseDateInput(startsOn);
    if (!iso) {
      fieldErrors.startsOn = t("entries.errors.dateInvalid");
    } else {
      start = toUtcDate(iso);
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      amountCents: amountCents as number,
      categoryId,
      dayOfMonth: day,
      merchant: optional(merchant),
      paymentMethod: optional(paymentMethod),
      note: optional(note),
      startsOn: start as Date,
      active,
    },
  };
}
