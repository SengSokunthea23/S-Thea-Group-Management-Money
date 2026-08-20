"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";

export type ApprovalState =
  | { ok: true; approved: boolean }
  | { ok: false; error: string }
  | null;

/**
 * Approve or reject a cross-device sign-in.
 *
 * This runs on the phone, which is inside the authenticated route group — so
 * reaching it at all means being signed in, and `getCurrentUser` names who is
 * approving. That identity is the entire point: the waiting browser gets a
 * session for *this* user and no other.
 *
 * The filter carries `status: "PENDING"`, so a request that has already been
 * decided or consumed cannot be flipped by a second tap.
 */
async function decide(
  requestId: string,
  approved: boolean,
): Promise<ApprovalState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: t("settings.errors.sessionExpired") };
  }

  const request = await prisma.loginRequest.findUnique({
    where: { id: requestId },
    select: { status: true, expiresAt: true },
  });

  if (!request || request.expiresAt <= new Date()) {
    return { ok: false, error: t("approve.errors.expired") };
  }
  if (request.status !== "PENDING") {
    return { ok: false, error: t("approve.errors.alreadyDecided") };
  }

  const { count } = await prisma.loginRequest.updateMany({
    where: { id: requestId, status: "PENDING" },
    data: {
      status: approved ? "APPROVED" : "REJECTED",
      // Recorded only on approval — this is the account the waiting browser
      // will be signed in as.
      userId: approved ? user.id : null,
      approvedAt: approved ? new Date() : null,
    },
  });

  if (count === 0) {
    return { ok: false, error: t("approve.errors.alreadyDecided") };
  }

  revalidatePath(`/approve/${requestId}`);
  return { ok: true, approved };
}

export async function approveLoginRequest(
  requestId: string,
): Promise<ApprovalState> {
  return decide(requestId, true);
}

export async function rejectLoginRequest(
  requestId: string,
): Promise<ApprovalState> {
  return decide(requestId, false);
}
