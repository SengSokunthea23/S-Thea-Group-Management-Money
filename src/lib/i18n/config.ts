// Locale constants only — no dictionaries, no `server-only`. This module is
// imported from both server and client code, so it must stay dependency-free.
//
// The codes match User.language (see src/lib/profile.ts): a signed-in user's
// stored preference and the request cookie are the same vocabulary.

export const LOCALES = ["en", "km"] as const;

export type Locale = (typeof LOCALES)[number];

export const LOCALE_COOKIE = "crm_lang";

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Each label is written in its own script — a language picker the reader
 * cannot read is useless.
 */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  km: "ភាសាខ្មែរ",
};

/** Short form for the compact segmented switcher. */
export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  en: "EN",
  km: "ខ្មែរ",
};

/**
 * BCP 47 tag for `Intl` and the <html lang> attribute. Kept separate from the
 * storage code so the cookie value stays a short, stable identifier.
 */
export const LOCALE_TAGS: Record<Locale, string> = {
  en: "en-US",
  km: "km-KH",
};

export function isLocale(value: unknown): value is Locale {
  return LOCALES.includes(value as Locale);
}

export function toLocale(value: string | undefined | null): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}
