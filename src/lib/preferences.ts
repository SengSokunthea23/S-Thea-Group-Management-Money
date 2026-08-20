import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, toLocale, type Locale } from "@/lib/i18n/config";
import { createTranslator, type Translator } from "@/lib/i18n/translate";
import { THEME_COOKIE, toTheme, type Theme } from "@/lib/theme";

/**
 * Server-side reads of the two display preferences.
 *
 * Both live in cookies rather than only in the database because they must apply
 * before there is a session — /login is themed and translated too — and because
 * reading them costs nothing on a request that is already dynamic.
 *
 * `cache` dedupes the cookie read across the layout, the page, and any server
 * component in between, within a single request.
 */

export const getLocale = cache(async (): Promise<Locale> => {
  const store = await cookies();
  return toLocale(store.get(LOCALE_COOKIE)?.value);
});

export const getTheme = cache(async (): Promise<Theme> => {
  const store = await cookies();
  return toTheme(store.get(THEME_COOKIE)?.value);
});

/** The server-side counterpart of `useT()` — same keys, same output. */
export async function getT(): Promise<Translator> {
  return createTranslator(await getLocale());
}
