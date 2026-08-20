import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { formatMonthLong, formatMonthShort, formatRelative } from "@/lib/format";
import type { EntryType } from "@/lib/finance";

// Aggregation for the dashboard. Formatting must stay deterministic across the
// server/client boundary, which is why the locale is passed in rather than read
// from the runtime. Relative times are only ever rendered from server
// components, so "now" is evaluated once per request.

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(
  date: Date,
  now: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE,
): string {
  const seconds = Math.round((date.getTime() - now.getTime()) / 1000);
  const magnitude = Math.abs(seconds);
  const rel = (value: number, unit: Intl.RelativeTimeFormatUnit) =>
    formatRelative(value, unit, locale);

  if (magnitude < MINUTE) return rel(seconds, "second");
  if (magnitude < HOUR) return rel(Math.round(seconds / MINUTE), "minute");
  if (magnitude < DAY) return rel(Math.round(seconds / HOUR), "hour");
  if (magnitude < MONTH) return rel(Math.round(seconds / DAY), "day");
  if (magnitude < YEAR) return rel(Math.round(seconds / MONTH), "month");
  return rel(Math.round(seconds / YEAR), "year");
}

/** Bar size as a percentage of the largest value, floored so nonzero stays visible. */
export function barPercent(value: number, max: number): number {
  if (max <= 0 || value <= 0) return 0;
  return Math.max(2, Math.round((value / max) * 100));
}

// --- reporting period ---------------------------------------------------

/**
 * The window every figure on the dashboard is measured over. Exposed in the URL
 * as `?period=`, so a particular view is linkable and the page stays a server
 * component — no client state, no hydration surface.
 */
export const PERIODS = ["month", "quarter", "year", "all"] as const;

export type Period = (typeof PERIODS)[number];

export const DEFAULT_PERIOD: Period = "year";

export function isPeriod(value: unknown): value is Period {
  return PERIODS.includes(value as Period);
}

export function toPeriod(value: string | undefined | null): Period {
  return isPeriod(value) ? value : DEFAULT_PERIOD;
}

/**
 * Inclusive lower bound at UTC midnight, or null for "all". Callers pass it
 * straight to a Prisma `gte`, so null means "no date filter at all".
 */
export function periodStart(period: Period, now: Date): Date | null {
  if (period === "all") return null;

  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  // Every window is trailing and *includes* the current month, so each one is a
  // superset of the one before it and the figures only ever grow as you widen
  // the period. Calendar-aligned windows would break that: a calendar year
  // viewed in January is a single column, and would report less than "last 3
  // months" sitting next to it.
  const monthsBack: Record<Exclude<Period, "all">, number> = {
    month: 0,
    quarter: 2,
    year: 11,
  };

  return new Date(Date.UTC(year, month - monthsBack[period], 1));
}

// --- the four figures ---------------------------------------------------

/**
 * The four points the app exists to study, plus the two ratios that make them
 * mean something. Totals are integer cents; rates are percentages rounded to
 * whole numbers.
 */
export type Summary = {
  incomeCents: number;
  expenseCents: number;
  savingCents: number;
  sourceCount: number;

  /** Income minus expenses. Negative when spending outran earning. */
  netCents: number;
  /** Savings as a share of income, or null when there was no income to save from. */
  savingsRate: number | null;
  /** Expenses as a share of income, or null for the same reason. */
  expenseRate: number | null;
};

export type TypedTotals = Record<EntryType, number>;

export function emptyTotals(): TypedTotals {
  return { INCOME: 0, EXPENSE: 0, SAVING: 0 };
}

/** Percentage of `whole`, or null when there is no whole to take a share of. */
function share(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 100);
}

export function summarise(
  totals: TypedTotals,
  sourceCount: number,
): Summary {
  const incomeCents = totals.INCOME;
  const expenseCents = totals.EXPENSE;
  const savingCents = totals.SAVING;

  return {
    incomeCents,
    expenseCents,
    savingCents,
    sourceCount,
    netCents: incomeCents - expenseCents,
    savingsRate: share(savingCents, incomeCents),
    expenseRate: share(expenseCents, incomeCents),
  };
}

// --- monthly trend ------------------------------------------------------

export type MonthBucket = {
  key: string;
  /** "August 2026", localised — used by the tooltip and the reader table. */
  label: string;
  /** "Aug" — used on the axis. */
  shortLabel: string;
  /** True in January, where the axis repeats the year for orientation. */
  isYearStart: boolean;
  year: number;
  totals: TypedTotals;
};

/** Month bucket key in UTC, so no time zone can shift an entry into a neighbour. */
export function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Twelve buckets ending with the current month, all zeroed. Months with no
 * activity stay in the series — dropping them would distort the time axis.
 */
export function lastTwelveMonths(
  now: Date,
  locale: Locale = DEFAULT_LOCALE,
): MonthBucket[] {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const buckets: MonthBucket[] = [];

  for (let offset = 11; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(year, month - offset, 1));
    buckets.push({
      key: monthKey(date),
      label: formatMonthLong(date, locale),
      shortLabel: formatMonthShort(date, locale),
      isYearStart: date.getUTCMonth() === 0,
      year: date.getUTCFullYear(),
      totals: emptyTotals(),
    });
  }

  return buckets;
}

export function bucketByMonth(
  entries: { type: EntryType; amountCents: number; occurredOn: Date }[],
  now: Date,
  locale: Locale = DEFAULT_LOCALE,
): MonthBucket[] {
  const buckets = lastTwelveMonths(now, locale);
  const index = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  for (const entry of entries) {
    const bucket = index.get(monthKey(entry.occurredOn));
    // Entries outside the window are simply not in the map.
    if (bucket) bucket.totals[entry.type] += entry.amountCents;
  }

  return buckets;
}

// --- breakdowns ---------------------------------------------------------

export type Slice = {
  key: string;
  label: string;
  valueCents: number;
  /** Share of the breakdown's total, as a whole percentage. */
  percent: number;
};

/**
 * Turns a keyed set of totals into a sorted, percentage-carrying list. Zero and
 * negative rows are dropped: a breakdown is about where the money went, and a
 * category with nothing in it is noise on the chart.
 */
export function toSlices(
  totals: Map<string, number>,
  label: (key: string) => string,
): Slice[] {
  const rows = [...totals.entries()].filter(([, value]) => value > 0);
  const sum = rows.reduce((total, [, value]) => total + value, 0);

  return rows
    .map(([key, valueCents]) => ({
      key,
      label: label(key),
      valueCents,
      percent: sum > 0 ? Math.round((valueCents / sum) * 100) : 0,
    }))
    .sort((a, b) => b.valueCents - a.valueCents);
}
