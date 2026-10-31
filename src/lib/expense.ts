import type { Translator } from "@/lib/i18n/translate";

// The expense side of the ledger: how spending is classified, how it is paid
// for, and how it is measured against a budget.
//
// Categories used to be a fixed list here. They are rows now — see
// ExpenseCategory in the schema — so this module holds the vocabulary that is
// still genuinely fixed, plus the seed list new accounts start from.

// --- payment methods ----------------------------------------------------

/**
 * Fixed rather than user-defined, unlike categories. The set of ways money
 * physically leaves an account is small and stable, and the reason to record it
 * is reconciling against a bank statement — which only works if everyone means
 * the same thing by "card".
 */
export const PAYMENT_METHODS = ["CASH", "CARD", "BANK", "OTHER"] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export function isPaymentMethod(value: unknown): value is PaymentMethod {
  return PAYMENT_METHODS.includes(value as PaymentMethod);
}

export function paymentMethodLabel(
  t: Translator,
  method: string | null,
): string {
  if (!method || !isPaymentMethod(method)) return t("common.empty");
  return t(`expense.paymentMethod.${method}`);
}

// --- category tones -----------------------------------------------------

/**
 * The badge colours a category can wear. Offered as a named set rather than a
 * colour picker: these are the tones the theme already defines in both light
 * and dark, so any of them stays legible either way.
 */
export const CATEGORY_TONES = [
  "neutral",
  "indigo",
  "emerald",
  "amber",
  "rose",
] as const;

export type CategoryTone = (typeof CATEGORY_TONES)[number];

export function isCategoryTone(value: unknown): value is CategoryTone {
  return CATEGORY_TONES.includes(value as CategoryTone);
}

export function toCategoryTone(value: string): CategoryTone {
  return isCategoryTone(value) ? value : "neutral";
}

export function toneClass(tone: string): string {
  return `badge badge-${toCategoryTone(tone)}`;
}

// --- starting categories ------------------------------------------------

/**
 * What a new account begins with. The old built-in list, kept as a starting
 * point rather than a constraint — the names are seeded into the user's own
 * rows, and from there they are theirs to rename or retire.
 *
 * `key` matches the legacy `Entry.category` strings so the backfill can map
 * existing spending onto the right new row.
 */
export const DEFAULT_EXPENSE_CATEGORIES: {
  key: string;
  tone: CategoryTone;
}[] = [
  { key: "HOUSING", tone: "indigo" },
  { key: "FOOD", tone: "emerald" },
  { key: "TRANSPORT", tone: "neutral" },
  { key: "UTILITIES", tone: "neutral" },
  { key: "HEALTH", tone: "rose" },
  { key: "EDUCATION", tone: "indigo" },
  { key: "LEISURE", tone: "amber" },
  { key: "DEBT", tone: "rose" },
  { key: "OTHER", tone: "neutral" },
];

// --- serialisable shapes ------------------------------------------------

export type CategoryRecord = {
  id: string;
  name: string;
  budgetCents: number | null;
  tone: string;
  active: boolean;
  sortOrder: number;
  /** Spend in the current month, for the budget meter. */
  spentCents: number;
  entryCount: number;
};

export type CategoryOption = {
  id: string;
  name: string;
  tone: string;
};

export type AttachmentRecord = {
  id: string;
  mimeType: string;
  fileName: string | null;
  byteSize: number;
};

export type RecurringRecord = {
  id: string;
  amountCents: number;
  dayOfMonth: number;
  merchant: string | null;
  paymentMethod: string | null;
  note: string | null;
  active: boolean;
  startsOn: string;
  lastPostedMonth: string | null;
  categoryId: string | null;
  categoryName: string | null;
  categoryTone: string | null;
};

// --- budgets ------------------------------------------------------------

export type BudgetStatus = "none" | "under" | "close" | "over";

/** Where spending sits against a budget, as a share and a verdict. */
export type BudgetProgress = {
  budgetCents: number | null;
  spentCents: number;
  /** Spend as a percentage of budget, uncapped so overspend is visible. */
  percent: number;
  /** Negative once the budget is exceeded. */
  remainingCents: number;
  status: BudgetStatus;
};

/** Warn before the line is crossed, not only after. */
const CLOSE_THRESHOLD = 0.85;

export function budgetProgress(
  spentCents: number,
  budgetCents: number | null,
): BudgetProgress {
  if (budgetCents === null || budgetCents <= 0) {
    return {
      budgetCents,
      spentCents,
      percent: 0,
      remainingCents: 0,
      status: "none",
    };
  }

  const ratio = spentCents / budgetCents;

  return {
    budgetCents,
    spentCents,
    percent: Math.round(ratio * 100),
    remainingCents: budgetCents - spentCents,
    status: ratio > 1 ? "over" : ratio >= CLOSE_THRESHOLD ? "close" : "under",
  };
}

export const BUDGET_STATUS_FILL: Record<BudgetStatus, string> = {
  none: "bg-accent",
  under: "bg-[var(--badge-emerald-fg)]",
  close: "bg-[var(--badge-amber-fg)]",
  over: "bg-[var(--badge-rose-fg)]",
};

// --- month keys ---------------------------------------------------------

/** "YYYY-MM" in UTC, matching RecurringExpense.lastPostedMonth. */
export function monthKeyOf(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * The real day a "day 31" template lands on in a given month. February has no
 * 31st, and rolling forward into March would quietly move the expense into the
 * wrong month.
 */
export function clampDayToMonth(
  year: number,
  monthIndex: number,
  day: number,
): Date {
  const lastDay = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return new Date(Date.UTC(year, monthIndex, Math.min(Math.max(day, 1), lastDay)));
}
