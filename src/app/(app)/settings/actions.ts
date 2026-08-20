"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  SESSION_COOKIE,
  getCurrentUser,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";
import {
  parsePasswordInput,
  parseProfileInput,
  type PasswordFieldErrors,
  type ProfileFieldErrors,
} from "@/lib/profile";
import { getT } from "@/lib/preferences";
import { LOCALE_COOKIE, LOCALE_COOKIE_MAX_AGE } from "@/lib/i18n/config";
import { createTranslator } from "@/lib/i18n/translate";

export type ProfileState =
  | { ok: true; message: string }
  | { ok: false; fieldErrors: ProfileFieldErrors; formError?: string }
  | null;

export type PasswordState =
  | { ok: true; message: string }
  | { ok: false; fieldErrors: PasswordFieldErrors; formError?: string }
  | null;

export async function updateProfile(
  _prevState: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = await parseProfileInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  // The three avatar cases map to three different column writes. "keep" must
  // touch nothing — passing undefined would be the same as not setting it, but
  // being explicit keeps the intent legible next to the other two.
  const avatarColumns =
    parsed.avatar.kind === "replace"
      ? {
          avatarData: parsed.avatar.data,
          avatarType: parsed.avatar.type,
          avatarUpdatedAt: new Date(),
        }
      : parsed.avatar.kind === "remove"
        ? { avatarData: null, avatarType: null, avatarUpdatedAt: null }
        : {};

  await prisma.user.update({
    where: { id: user.id },
    data: { ...parsed.data, ...avatarColumns },
  });

  // The stored language *is* the interface locale, so saving the form has to
  // move the cookie too — otherwise the picker would claim Khmer while every
  // label stayed English until the next sign-in.
  const store = await cookies();
  store.set(LOCALE_COOKIE, parsed.data.language, {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  // The sidebar renders the name, and every label depends on the locale, so the
  // whole shell needs to re-render.
  revalidatePath("/", "layout");

  // Built from the submitted language rather than re-reading the cookie:
  // getLocale() is request-cached, so it would still report the old value here.
  // The confirmation should already be in the language just chosen.
  const saved = createTranslator(parsed.data.language);
  return { ok: true, message: saved("settings.profileUpdated") };
}

export async function changePassword(
  _prevState: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parsePasswordInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  const record = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!record) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  if (!(await verifyPassword(parsed.data.currentPassword, record.passwordHash))) {
    return {
      ok: false,
      fieldErrors: {
        currentPassword: t("settings.errors.currentPasswordWrong"),
      },
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  // Changing a password should end every other session — otherwise a stolen
  // cookie survives the very action taken to lock it out. The current session
  // is kept so the user isn't signed out of the tab they're working in.
  const store = await cookies();
  const currentToken = store.get(SESSION_COOKIE)?.value;
  const { createHash } = await import("node:crypto");
  const currentId = currentToken
    ? createHash("sha256").update(currentToken).digest("hex")
    : "";

  const { count } = await prisma.session.deleteMany({
    where: { userId: user.id, id: { not: currentId } },
  });

  revalidatePath("/settings");
  return {
    ok: true,
    message:
      count > 0
        ? t("settings.passwordChangedSessions", { count })
        : t("settings.passwordChanged"),
  };
}
