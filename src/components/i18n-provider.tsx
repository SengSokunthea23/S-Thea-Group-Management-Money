"use client";

import { createContext, useContext, useMemo } from "react";
import { DEFAULT_LOCALE, LOCALE_TAGS, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";

type I18nValue = {
  locale: Locale;
  /** BCP 47 tag for `Intl` — "en-US" or "km-KH". */
  tag: string;
  t: Translator;
};

const I18nContext = createContext<I18nValue | null>(null);

/**
 * Only the locale code crosses the server/client boundary; the translator is
 * rebuilt here from the bundled dictionaries. They are small, and shipping the
 * code beats serialising the whole catalogue into the RSC payload on every
 * navigation.
 */
export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({
      locale,
      tag: LOCALE_TAGS[locale],
      t: createTranslator(locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);

  if (!value) {
    // Rendering a client component outside the provider would silently fall
    // back to English and diverge from the server render — fail loudly instead.
    throw new Error("useI18n must be used inside <I18nProvider>.");
  }

  return value;
}

/** Shorthand for the common case. Same keys as the server's `getT()`. */
export function useT(): Translator {
  return useI18n().t;
}

/** Escape hatch for tests and stories that render a component in isolation. */
export const FALLBACK_LOCALE = DEFAULT_LOCALE;
