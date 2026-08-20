"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  clearSessionCookie,
  createSession,
  destroySession,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { getT } from "@/lib/preferences";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE, toLocale } from "@/lib/i18n/config";

export type LoginState = { error: string } | null;

export async function signIn(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const t = await getT();

  if (!email || !password) {
    return { error: t("login.missingFields") };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, passwordHash: true, language: true },
  });

  // Deliberately identical message for "no such user" and "wrong password" —
  // a distinct one would let anyone enumerate registered emails.
  const invalid = { error: t("login.invalidCredentials") };

  if (!user) {
    // Burn comparable time so response latency doesn't reveal the difference.
    await verifyPassword(password, "scrypt:00:00");
    return invalid;
  }

  if (!(await verifyPassword(password, user.passwordHash))) {
    return invalid;
  }

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);

  // Signing in adopts the account's saved language, so a user who set Khmer on
  // another machine lands in Khmer here rather than in whatever this browser
  // was last left on.
  const store = await cookies();
  store.set(LOCALE_COOKIE, toLocale(user.language), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  redirect("/");
}

export async function signOut() {
  const store = await cookies();
  await destroySession(store.get(SESSION_COOKIE)?.value);
  await clearSessionCookie();

  redirect("/login");
}
