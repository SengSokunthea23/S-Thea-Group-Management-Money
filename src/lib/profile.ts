// Same pattern as contacts.ts / deals.ts: SQLite has no enum type, so
// User.language is a String constrained here.
//
// The stored language is no longer a display-only preference — it is the same
// vocabulary as the interface locale, so these are thin aliases over
// src/lib/i18n/config.ts rather than a parallel list that could drift out of
// step with the dictionaries.

import {
  LOCALES,
  LOCALE_LABELS,
  isLocale,
  toLocale,
  type Locale,
} from "@/lib/i18n/config";
import type { Translator } from "@/lib/i18n/translate";
import {
  MAX_AVATAR_BYTES,
  sniffImageType,
  type AvatarType,
} from "@/lib/avatar";

export const LANGUAGES = LOCALES;

export type Language = Locale;

/**
 * Labels are intentionally shown in their own script — a language picker the
 * user cannot read is useless.
 */
export const LANGUAGE_LABELS: Record<Language, string> = LOCALE_LABELS;

export const isLanguage = isLocale;

export function toLanguage(value: string): Language {
  return toLocale(value);
}

export const MIN_PASSWORD_LENGTH = 8;

// --- profile ------------------------------------------------------------

export type ProfileField = "name" | "language" | "address" | "avatar";
export type ProfileFieldErrors = Partial<Record<ProfileField, string>>;

export type ProfileInput = {
  name: string;
  language: Language;
  address: string | null;
};

/**
 * What to do with the picture, kept apart from `ProfileInput` because the three
 * cases are genuinely different writes: leave the columns alone, clear them, or
 * replace them. Folding this into a nullable field would make "no change" and
 * "remove it" indistinguishable.
 */
export type AvatarChange =
  | { kind: "keep" }
  | { kind: "remove" }
  // Pinned to Uint8Array<ArrayBuffer> rather than the default
  // Uint8Array<ArrayBufferLike>: Prisma's Bytes input rejects the wider type,
  // since a SharedArrayBuffer-backed view cannot be safely handed to the driver.
  | { kind: "replace"; data: Uint8Array<ArrayBuffer>; type: AvatarType };

export type ProfileParseResult =
  | { ok: true; data: ProfileInput; avatar: AvatarChange }
  | { ok: false; fieldErrors: ProfileFieldErrors };

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Async because reading the uploaded file's bytes is. Everything else here is
 * ordinary synchronous validation.
 */
export async function parseProfileInput(
  formData: FormData,
  t: Translator,
): Promise<ProfileParseResult> {
  const name = text(formData, "name");
  const language = text(formData, "language");
  const address = text(formData, "address");

  const fieldErrors: ProfileFieldErrors = {};

  if (!name) {
    fieldErrors.name = t("settings.errors.nameRequired");
  } else if (name.length > 120) {
    fieldErrors.name = t("settings.errors.nameTooLong");
  }

  if (!isLanguage(language)) {
    fieldErrors.language = t("settings.errors.languageInvalid");
  }

  if (address.length > 500) {
    fieldErrors.address = t("settings.errors.addressTooLong");
  }

  const avatar = await parseAvatar(formData, t, fieldErrors);

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: {
      name,
      language: language as Language,
      address: address.length > 0 ? address : null,
    },
    avatar,
  };
}

/**
 * Reads the uploaded picture, if there is one.
 *
 * The browser already downscaled it, so the size cap here is a backstop for a
 * request that skipped the form. The format is decided by sniffing the leading
 * bytes rather than by the `type` the client reports — those bytes are later
 * served back under a Content-Type we choose, and taking the claim at face
 * value would let someone store one thing and have it served as another.
 */
async function parseAvatar(
  formData: FormData,
  t: Translator,
  fieldErrors: ProfileFieldErrors,
): Promise<AvatarChange> {
  if (formData.get("removeAvatar") === "1") return { kind: "remove" };

  const file = formData.get("avatar");
  // An untouched file input still submits an empty File, hence the size check.
  if (!(file instanceof File) || file.size === 0) return { kind: "keep" };

  if (file.size > MAX_AVATAR_BYTES) {
    fieldErrors.avatar = t("settings.errors.avatarTooLarge");
    return { kind: "keep" };
  }

  const data = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(data);

  if (!type) {
    fieldErrors.avatar = t("settings.errors.avatarType");
    return { kind: "keep" };
  }

  return { kind: "replace", data, type };
}

// --- password change ----------------------------------------------------

export type PasswordField = "currentPassword" | "newPassword" | "confirmPassword";
export type PasswordFieldErrors = Partial<Record<PasswordField, string>>;

export type PasswordParseResult =
  | { ok: true; data: { currentPassword: string; newPassword: string } }
  | { ok: false; fieldErrors: PasswordFieldErrors };

export function parsePasswordInput(
  formData: FormData,
  t: Translator,
): PasswordParseResult {
  // Not trimmed — leading and trailing spaces are legitimate password characters.
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  const fieldErrors: PasswordFieldErrors = {};

  if (!currentPassword) {
    fieldErrors.currentPassword = t("settings.errors.currentPasswordRequired");
  }

  if (!newPassword) {
    fieldErrors.newPassword = t("settings.errors.newPasswordRequired");
  } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
    fieldErrors.newPassword = t("settings.errors.newPasswordTooShort", {
      count: MIN_PASSWORD_LENGTH,
    });
  } else if (newPassword === currentPassword) {
    fieldErrors.newPassword = t("settings.errors.newPasswordSame");
  }

  if (newPassword && confirmPassword !== newPassword) {
    fieldErrors.confirmPassword = t("settings.errors.passwordMismatch");
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return { ok: true, data: { currentPassword, newPassword } };
}
