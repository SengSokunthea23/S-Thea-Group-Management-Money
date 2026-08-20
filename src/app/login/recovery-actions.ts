"use server";

import { cookies, headers } from "next/headers";
import QRCode from "qrcode";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createSession,
  hashPassword,
  setSessionCookie,
} from "@/lib/auth";
import {
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  toLocale,
} from "@/lib/i18n/config";
import { getT } from "@/lib/preferences";
import { maskPhone, normalisePhone } from "@/lib/phone";
import { CAN_REVEAL_CODES } from "@/lib/sms";
import {
  MIN_PASSWORD_LENGTH,
  type PasswordFieldErrors,
} from "@/lib/profile";
import {
  checkCode,
  issueCode,
  sweepExpiredCodes,
} from "@/lib/verification";
import {
  LOGIN_REQUEST_TTL_MS,
  clearLoginRequestCookie,
  createLoginRequest,
  claimLoginRequest,
  sweepExpiredLoginRequests,
} from "@/lib/login-request";

/**
 * Password recovery by phone, in three steps: prove you hold the number, then
 * choose a new password.
 *
 * A recurring theme below is *not saying whether an account exists*. The reset
 * page is reachable by anyone, so every response for an unknown number matches
 * the response for a known one. Otherwise the form becomes a free tool for
 * checking which phone numbers have accounts here.
 */

/** Cookie holding "which account is mid-reset", set only once a code is right. */
const RESET_COOKIE = "crm_reset";
const RESET_TTL_SECONDS = 10 * 60;

// --- step 1: send a code ------------------------------------------------

export type SendCodeState =
  | { ok: true; maskedPhone: string | null; devCode?: string }
  | { ok: false; error: string }
  | null;

export async function sendResetCode(
  _prev: SendCodeState,
  formData: FormData,
): Promise<SendCodeState> {
  const t = await getT();
  void sweepExpiredCodes();

  const phone = normalisePhone(String(formData.get("phone") ?? ""));
  if (!phone) return { ok: false, error: t("recovery.errors.phoneInvalid") };

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phone: true, phoneVerifiedAt: true },
  });

  // Unverified numbers cannot recover an account — see the schema note on
  // User.phoneVerifiedAt. Treated identically to "no such account" here.
  const eligible = user?.phoneVerifiedAt ? user : null;

  if (!eligible) {
    // Deliberately the success shape. The caller advances to the code screen
    // and a wrong number simply never produces a working code.
    return { ok: true, maskedPhone: maskPhone(phone) };
  }

  const issued = await issueCode(
    eligible.id,
    "PASSWORD_RESET",
    phone,
    (code) => t("recovery.smsBody", { code }),
  );

  if (!issued.ok) {
    return { ok: false, error: t("recovery.errors.rateLimited") };
  }

  // Remembering the phone (not the user id) lets step 2 find the account
  // without trusting a client-supplied id.
  const store = await cookies();
  store.set(RESET_COOKIE, phone, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RESET_TTL_SECONDS,
  });

  return {
    ok: true,
    maskedPhone: maskPhone(phone),
    // Development only. In production the code exists in the log and the SMS,
    // nowhere else — see CAN_REVEAL_CODES.
    ...(CAN_REVEAL_CODES ? { devCode: issued.code } : {}),
  };
}

// --- step 2: check the code ---------------------------------------------

export type CheckCodeState = { ok: true } | { ok: false; error: string } | null;

/** Set once a code has been accepted; gates the new-password step. */
const VERIFIED_COOKIE = "crm_reset_ok";

export async function verifyResetCode(
  _prev: CheckCodeState,
  formData: FormData,
): Promise<CheckCodeState> {
  const t = await getT();
  const store = await cookies();
  const phone = store.get(RESET_COOKIE)?.value;

  const submitted = String(formData.get("code") ?? "");
  if (!submitted.trim()) {
    return { ok: false, error: t("recovery.errors.codeRequired") };
  }

  // No cookie means either a wrong number at step 1 or an expired attempt.
  // Both look like a wrong code, which is the point.
  if (!phone) return { ok: false, error: t("recovery.errors.codeInvalid") };

  const user = await prisma.user.findUnique({
    where: { phone },
    select: { id: true, phoneVerifiedAt: true },
  });
  if (!user?.phoneVerifiedAt) {
    return { ok: false, error: t("recovery.errors.codeInvalid") };
  }

  const result = await checkCode(user.id, "PASSWORD_RESET", submitted);
  if (!result.ok) {
    return {
      ok: false,
      error:
        result.reason === "expired"
          ? t("recovery.errors.codeExpired")
          : result.reason === "too_many_attempts"
            ? t("recovery.errors.tooManyAttempts")
            : t("recovery.errors.codeInvalid"),
    };
  }

  store.set(VERIFIED_COOKIE, user.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: RESET_TTL_SECONDS,
  });

  return { ok: true };
}

// --- step 3: set a new password -----------------------------------------

export type ResetPasswordState =
  | { ok: false; fieldErrors: PasswordFieldErrors; formError?: string }
  | null;

export async function resetPassword(
  _prev: ResetPasswordState,
  formData: FormData,
): Promise<ResetPasswordState> {
  const t = await getT();
  const store = await cookies();
  const userId = store.get(VERIFIED_COOKIE)?.value;

  if (!userId) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("recovery.errors.startOver"),
    };
  }

  // Not trimmed — leading and trailing spaces are legitimate password characters.
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: PasswordFieldErrors = {};
  if (!newPassword) {
    fieldErrors.newPassword = t("settings.errors.newPasswordRequired");
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.newPassword = t("settings.errors.newPasswordTooShort", {
      count: MIN_PASSWORD_LENGTH,
    });
  }
  if (newPassword && confirmPassword !== newPassword) {
    fieldErrors.confirmPassword = t("settings.errors.passwordMismatch");
  }
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, language: true },
  });
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("recovery.errors.startOver"),
    };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(newPassword) },
  });

  // Every existing session dies. Recovery is what someone does when they fear
  // they have lost control of the account, so leaving other devices signed in
  // would defeat the exercise.
  await prisma.session.deleteMany({ where: { userId: user.id } });

  store.delete(RESET_COOKIE);
  store.delete(VERIFIED_COOKIE);

  const { token, expiresAt } = await createSession(user.id);
  await setSessionCookie(token, expiresAt);
  store.set(LOCALE_COOKIE, toLocale(user.language), {
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });

  redirect("/");
}

// --- QR sign-in ---------------------------------------------------------

export type QrChallenge = {
  /** Inline SVG markup for the code. */
  svg: string;
  /** The same URL in text, for anyone who cannot scan. */
  approveUrl: string;
  ttlMs: number;
};

/**
 * Mints a sign-in request and draws its QR.
 *
 * A server action rather than work done while rendering /login/qr, because
 * creating a request sets an httpOnly cookie and Next only permits that from an
 * action or a route handler. The page is a shell; the client asks for a code on
 * mount and again whenever one goes stale.
 */
export async function startQrLogin(): Promise<QrChallenge> {
  void sweepExpiredLoginRequests();

  const id = await createLoginRequest();
  const store = await headers();

  // Built from the request's own Host so the code works from a phone on the
  // same network — a hardcoded localhost would encode a URL the phone cannot
  // reach.
  const host = store.get("host") ?? "localhost:3000";
  const proto = store.get("x-forwarded-proto") ?? "http";
  const approveUrl = `${proto}://${host}/approve/${id}`;

  // Rendered as SVG rather than a data-URL image: it stays crisp at any size
  // and costs no extra request. Kept black-on-white regardless of theme —
  // scanners want contrast, not a palette.
  const svg = await QRCode.toString(approveUrl, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 1,
    color: { dark: "#000000", light: "#ffffff" },
  });

  return { svg, approveUrl, ttlMs: LOGIN_REQUEST_TTL_MS };
}

export type QrPollState =
  | { status: "pending" }
  | { status: "expired" }
  | { status: "rejected" }
  | { status: "signedIn" };

/**
 * Polled by the waiting browser. On approval this is where the session is
 * actually minted — approval on the phone only records intent.
 */
export async function pollQrLogin(): Promise<QrPollState> {
  const result = await claimLoginRequest();

  if (result.status === "approved") {
    const user = await prisma.user.findUnique({
      where: { id: result.userId },
      select: { id: true, language: true },
    });

    if (!user) return { status: "expired" };

    const { token, expiresAt } = await createSession(user.id);
    await setSessionCookie(token, expiresAt);
    await clearLoginRequestCookie();

    const store = await cookies();
    store.set(LOCALE_COOKIE, toLocale(user.language), {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: LOCALE_COOKIE_MAX_AGE,
    });

    return { status: "signedIn" };
  }

  if (result.status === "expired") return { status: "expired" };
  if (result.status === "rejected") return { status: "rejected" };

  // "none" means no live request — treated as expired so the page offers a
  // fresh code rather than spinning forever.
  return result.status === "pending"
    ? { status: "pending" }
    : { status: "expired" };
}
