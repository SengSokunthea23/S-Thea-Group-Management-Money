"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  isLocale,
  type Locale,
} from "@/lib/i18n/config";
import {
  THEME_COOKIE,
  THEME_COOKIE_MAX_AGE,
  isTheme,
  type Theme,
} from "@/lib/theme";

/**
 * Display preferences are cookie-backed rather than session-backed: they have
 * to work on /login, before there is a user to hang them off. `httpOnly` is
 * deliberately false so the switchers can paint the new value immediately
 * instead of waiting for the round trip.
 */

export async function setLocale(locale: Locale): Promise<void> {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  // Mirror onto the account when there is one, so the choice follows the user
  // to another browser and the Members table stays truthful.
  const user = await getCurrentUser();
  if (user) {
    await prisma.user
      .update({ where: { id: user.id }, data: { language: locale } })
      .catch(() => {});
  }

  // Every rendered string depends on this, so the whole tree is stale.
  revalidatePath("/", "layout");
}

export async function setTheme(theme: Theme): Promise<void> {
  if (!isTheme(theme)) return;

  const store = await cookies();
  store.set(THEME_COOKIE, theme, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: THEME_COOKIE_MAX_AGE,
  });

  // Only the <html data-theme> attribute changes, and that lives in the root
  // layout — but revalidating it keeps a hard refresh consistent with the
  // optimistic update the switcher already applied.
  revalidatePath("/", "layout");
}
