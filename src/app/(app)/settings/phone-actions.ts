"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";
import { maskPhone, normalisePhone } from "@/lib/phone";
import { CAN_REVEAL_CODES } from "@/lib/sms";
import { checkCode, issueCode } from "@/lib/verification";

/**
 * Setting a recovery phone, and proving you hold it.
 *
 * Verification is not decoration here. Recovery hands over an account to
 * whoever answers the number, so an unverified number would let anyone who
 * briefly held a session point recovery at a handset they own and walk back in
 * later. Saving a number therefore clears `phoneVerifiedAt`, and only a code
 * round-trip sets it again.
 */

export type PhoneState =
  | { ok: true; step: "verify"; maskedPhone: string; devCode?: string }
  | { ok: true; step: "verified"; message: string }
  | { ok: true; step: "cleared"; message: string }
  | { ok: false; error: string }
  | null;

export async function savePhone(
  _prev: PhoneState,
  formData: FormData,
): Promise<PhoneState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t("settings.errors.sessionExpired") };

  const raw = String(formData.get("phone") ?? "").trim();

  // An emptied field removes the number, and with it the recovery route.
  if (!raw) {
    await prisma.user.update({
      where: { id: user.id },
      data: { phone: null, phoneVerifiedAt: null },
    });
    revalidatePath("/settings");
    return { ok: true, step: "cleared", message: t("phone.removed") };
  }

  const phone = normalisePhone(raw);
  if (!phone) return { ok: false, error: t("recovery.errors.phoneInvalid") };

  // The column is unique, so a clash means the number is already recovering
  // some other account. Reported plainly: the person typing already knows
  // whether the number is theirs, so this leaks nothing they don't have.
  const existing = await prisma.user.findUnique({
    where: { phone },
    select: { id: true },
  });
  if (existing && existing.id !== user.id) {
    return { ok: false, error: t("phone.errors.taken") };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { phone, phoneVerifiedAt: null },
  });

  const issued = await issueCode(user.id, "PHONE_VERIFY", phone, (code) =>
    t("phone.smsBody", { code }),
  );
  if (!issued.ok) {
    return { ok: false, error: t("recovery.errors.rateLimited") };
  }

  revalidatePath("/settings");

  return {
    ok: true,
    step: "verify",
    maskedPhone: maskPhone(phone),
    ...(CAN_REVEAL_CODES ? { devCode: issued.code } : {}),
  };
}

export async function confirmPhone(
  _prev: PhoneState,
  formData: FormData,
): Promise<PhoneState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: t("settings.errors.sessionExpired") };

  const submitted = String(formData.get("code") ?? "");
  if (!submitted.trim()) {
    return { ok: false, error: t("recovery.errors.codeRequired") };
  }

  const result = await checkCode(user.id, "PHONE_VERIFY", submitted);
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

  await prisma.user.update({
    where: { id: user.id },
    data: { phoneVerifiedAt: new Date() },
  });

  revalidatePath("/settings");
  return { ok: true, step: "verified", message: t("phone.verified") };
}
