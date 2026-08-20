import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "@/lib/i18n/config";

/**
 * Number and date formatting.
 *
 * Dates and month names follow the reader's locale. Money deliberately does
 * not — see MONEY_TAG below. Instances are memoised because constructing an
 * `Intl` formatter is the expensive part, and a table redraws hundreds of
 * cells with the same one.
 */

/**
 * Money is always formatted as en-US, in every locale.
 *
 * Not an oversight, and not laziness about Khmer. Node and Chrome ship
 * different CLDR vintages, and they disagree about this exact case: Node
 * renders USD under km-KH as "120,000$" while Chrome renders "$120,000".
 * `formatCurrency` is called from client components, so that disagreement
 * surfaces as a hydration mismatch — React discards the server HTML and
 * re-renders the subtree on every load.
 *
 * Pinning also matches what the value is: the amount is USD regardless of who
 * is reading it, "$120,000" is unambiguous in both languages, and Cambodian
 * usage writes USD with a leading "$" anyway. The compact form settles it —
 * km-KH would render "120 ពាន់$", mixing a Khmer scale word into a dollar
 * figure under a Latin-numeral axis.
 */
const MONEY_TAG = LOCALE_TAGS.en;

/** Locale-keyed cache for the formatters that *do* follow the reader. */
function memoise<T>(build: (tag: string) => T): (locale: Locale) => T {
  const cache = new Map<Locale, T>();

  return (locale: Locale) => {
    const hit = cache.get(locale);
    if (hit) return hit;

    const made = build(LOCALE_TAGS[locale] ?? LOCALE_TAGS[DEFAULT_LOCALE]);
    cache.set(locale, made);
    return made;
  };
}

const CURRENCY = new Intl.NumberFormat(MONEY_TAG, {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const COMPACT_CURRENCY = new Intl.NumberFormat(MONEY_TAG, {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 1,
});

const integer = memoise((tag) => new Intl.NumberFormat(tag));

const relative = memoise(
  (tag) => new Intl.RelativeTimeFormat(tag, { numeric: "auto" }),
);

const monthShort = memoise(
  (tag) => new Intl.DateTimeFormat(tag, { month: "short", timeZone: "UTC" }),
);

const monthLong = memoise(
  (tag) =>
    new Intl.DateTimeFormat(tag, {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }),
);

/**
 * Money is stored as integer cents; display is whole dollars. No `locale`
 * parameter, unlike its neighbours below — the omission is the point, and a
 * parameter that was accepted and ignored would only invite callers to assume
 * otherwise.
 */
export function formatCurrency(valueCents: number): string {
  return CURRENCY.format(valueCents / 100);
}

/** Axis and peak labels, where "$120K" has to fit under a bar. */
export function formatCompactCurrency(valueCents: number): string {
  return COMPACT_CURRENCY.format(valueCents / 100);
}

export function formatNumber(
  value: number,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return integer(locale).format(value);
}

export function formatMonthShort(
  date: Date,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return monthShort(locale).format(date);
}

export function formatMonthLong(
  date: Date,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return monthLong(locale).format(date);
}

export function formatRelative(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return relative(locale).format(value, unit);
}
