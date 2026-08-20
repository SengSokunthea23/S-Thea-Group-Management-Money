/**
 * Phone numbers, normalised so that lookup is exact.
 *
 * Recovery matches an account by number, which only works if "+855 12 345 678",
 * "+855-12-345-678" and "085512345678" all reduce to one string. Full E.164
 * parsing needs a country database; this does the reduction that matters —
 * strip formatting, keep a leading +, and accept a national number by pairing
 * it with a default country code.
 */

/** Cambodia. The app already dates as dd/mm/yyyy for the same reason. */
export const DEFAULT_COUNTRY_CODE = "+855";

export const MIN_PHONE_DIGITS = 8;
export const MAX_PHONE_DIGITS = 15; // E.164's own ceiling.

/**
 * Reduces user input to `+<digits>`, or null when it cannot be one.
 *
 * A number typed without a country code is assumed to be national and gets the
 * default prefix, with a single leading trunk zero dropped — "012 345 678" is
 * how a Cambodian number is written down, and "+85512345678" is what it is.
 */
export function normalisePhone(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hadPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;

  // "00" is the other way of writing "+" internationally.
  const international = hadPlus
    ? digits
    : digits.startsWith("00")
      ? digits.slice(2)
      : null;

  const full =
    international ??
    `${DEFAULT_COUNTRY_CODE.slice(1)}${digits.replace(/^0/, "")}`;

  if (full.length < MIN_PHONE_DIGITS || full.length > MAX_PHONE_DIGITS) {
    return null;
  }

  return `+${full}`;
}

/**
 * Masked for display: "+855 •••• ••678".
 *
 * Recovery screens have to confirm *which* number was used without printing it
 * in full — the person reading may not be the account's owner.
 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length <= 4) return "•".repeat(digits.length);

  const country = digits.slice(0, 3);
  const tail = digits.slice(-3);
  const hidden = "•".repeat(Math.max(2, digits.length - 6));

  return `+${country} ${hidden}${tail}`;
}

/** Grouped for readability in a form: "+855 12 345 678". */
export function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 6) return phone;

  const country = digits.slice(0, 3);
  const rest = digits.slice(3);
  const groups = rest.match(/.{1,3}/g) ?? [rest];

  return `+${country} ${groups.join(" ")}`;
}
