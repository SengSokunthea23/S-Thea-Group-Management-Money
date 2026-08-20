"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentSessionId, getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";

export type DeviceActionState =
  | { ok: true; message: string }
  | { ok: false; error: string }
  | null;

/**
 * Revoking a session deletes its row, which is what makes the cookie on that
 * device worthless: `getCurrentUser` looks the token's hash up on every
 * request, finds nothing, and treats it as signed out.
 *
 * Both actions scope their filter by `userId`, so a session id belonging to
 * somebody else matches nothing rather than being deleted.
 */
export async function revokeSession(
  sessionId: string,
): Promise<DeviceActionState> {
  const t = await getT();
  const [user, currentId] = await Promise.all([
    getCurrentUser(),
    getCurrentSessionId(),
  ]);

  if (!user) {
    return { ok: false, error: t("settings.errors.sessionExpired") };
  }

  // Signing yourself out from a list of devices is almost never what was meant,
  // and it would leave the page you are reading in a signed-out state. The
  // current row renders without a revoke control; this is the matching guard.
  if (sessionId === currentId) {
    return { ok: false, error: t("devices.errors.cannotRevokeCurrent") };
  }

  const { count } = await prisma.session.deleteMany({
    where: { id: sessionId, userId: user.id },
  });

  revalidatePath("/settings/devices");

  if (count === 0) {
    return { ok: false, error: t("devices.errors.revokeFailed") };
  }

  return { ok: true, message: t("devices.revoked") };
}

/** The panic button: everything except the device asking. */
export async function revokeOtherSessions(): Promise<DeviceActionState> {
  const t = await getT();
  const [user, currentId] = await Promise.all([
    getCurrentUser(),
    getCurrentSessionId(),
  ]);

  if (!user || !currentId) {
    return { ok: false, error: t("settings.errors.sessionExpired") };
  }

  const now = new Date();
  const others = { userId: user.id, id: { not: currentId } };

  // Counted before the delete, and scoped to unexpired rows so the number
  // reported back matches the number the page listed and the confirm prompt
  // quoted. Counting the deletion instead would include expired rows, which
  // are invisible on this screen and were not signed in to begin with —
  // "3 other devices were signed out" under a list showing two is alarming in
  // exactly the place a user is least able to shrug it off.
  const signedIn = await prisma.session.count({
    where: { ...others, expiresAt: { gt: now } },
  });

  // The sweep itself is deliberately wider: expired rows are dead weight, and
  // this is as good a moment as any to drop them.
  await prisma.session.deleteMany({ where: others });

  revalidatePath("/settings/devices");

  if (signedIn === 0) {
    return { ok: false, error: t("devices.errors.noOthers") };
  }

  return {
    ok: true,
    message: t("devices.revokedAll", { count: signedIn }),
  };
}
