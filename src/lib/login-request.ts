import "server-only";

import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  MAX_IP_LENGTH,
  MAX_USER_AGENT_LENGTH,
  truncate,
} from "@/lib/device";

/**
 * Cross-device sign-in: the handshake behind "scan the QR".
 *
 * The shape of it, and why:
 *
 *   1. The signed-out browser creates a request. It keeps a random `secret` in
 *      an httpOnly cookie; only the SHA-256 reaches the database.
 *   2. The QR encodes the request's `id` — and nothing else. An id is a
 *      pointer, not a credential.
 *   3. A phone that is *already signed in* opens that id, sees which browser is
 *      asking, and approves. Approval records who approved, and no more.
 *   4. The waiting browser polls with its cookie. Only a caller holding the
 *      secret can turn an approval into a session.
 *
 * Step 4 is the load-bearing one. Photographing the QR gets an attacker
 * nothing: the session is minted for whoever holds the secret, which is the
 * browser that drew the code. The residual risk runs the other way — someone
 * showing *you* a QR and hoping you approve their sign-in — which is why the
 * approval screen names the requesting device and why these live for two
 * minutes rather than an hour.
 */

export const LOGIN_REQUEST_COOKIE = "crm_qr";

/** Long enough to walk to your phone, short enough that a stale QR is useless. */
export const LOGIN_REQUEST_TTL_MS = 2 * 60 * 1000;

export const LOGIN_REQUEST_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "CONSUMED",
] as const;

export type LoginRequestStatus = (typeof LOGIN_REQUEST_STATUSES)[number];

function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

function secretsMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Starts a request and stores the secret in an httpOnly cookie.
 * Returns the id, which is all the QR needs to carry.
 */
export async function createLoginRequest(): Promise<string> {
  const secret = randomBytes(32).toString("hex");
  const store = await headers();

  const request = await prisma.loginRequest.create({
    data: {
      secretHash: hashSecret(secret),
      expiresAt: new Date(Date.now() + LOGIN_REQUEST_TTL_MS),
      userAgent: truncate(store.get("user-agent"), MAX_USER_AGENT_LENGTH),
      ipAddress: truncate(
        store.get("x-forwarded-for")?.split(",")[0] ?? store.get("x-real-ip"),
        MAX_IP_LENGTH,
      ),
    },
    select: { id: true },
  });

  const cookieStore = await cookies();
  cookieStore.set(LOGIN_REQUEST_COOKIE, `${request.id}:${secret}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: Math.ceil(LOGIN_REQUEST_TTL_MS / 1000),
  });

  return request.id;
}

export async function clearLoginRequestCookie(): Promise<void> {
  const store = await cookies();
  store.delete(LOGIN_REQUEST_COOKIE);
}

type PendingClaim = { id: string; secret: string };

async function readClaim(): Promise<PendingClaim | null> {
  const store = await cookies();
  const raw = store.get(LOGIN_REQUEST_COOKIE)?.value;
  if (!raw) return null;

  const separator = raw.indexOf(":");
  if (separator <= 0) return null;

  return { id: raw.slice(0, separator), secret: raw.slice(separator + 1) };
}

export type ClaimResult =
  | { status: "none" }
  | { status: "pending" }
  | { status: "expired" }
  | { status: "rejected" }
  | { status: "approved"; userId: string };

/**
 * What the waiting browser is allowed to know, and — on approval — the user to
 * sign in. Marks the request CONSUMED in the same breath, so a replayed poll
 * cannot mint a second session.
 */
export async function claimLoginRequest(): Promise<ClaimResult> {
  const claim = await readClaim();
  if (!claim) return { status: "none" };

  const request = await prisma.loginRequest.findUnique({
    where: { id: claim.id },
    select: {
      secretHash: true,
      status: true,
      userId: true,
      expiresAt: true,
    },
  });

  // A cookie pointing at a row that no longer exists is indistinguishable from
  // never having started — say so rather than inventing a failure.
  if (!request) return { status: "none" };

  // Holding the cookie is what proves this is the browser that drew the code.
  if (!secretsMatch(hashSecret(claim.secret), request.secretHash)) {
    return { status: "none" };
  }

  if (request.expiresAt <= new Date()) return { status: "expired" };
  if (request.status === "REJECTED") return { status: "rejected" };
  if (request.status !== "APPROVED" || !request.userId) {
    return { status: "pending" };
  }

  // Single use. The filter carries the expected status, so two polls racing
  // each other cannot both win.
  const { count } = await prisma.loginRequest.updateMany({
    where: { id: claim.id, status: "APPROVED" },
    data: { status: "CONSUMED" },
  });
  if (count === 0) return { status: "none" };

  return { status: "approved", userId: request.userId };
}

/** Housekeeping: drop requests nobody can act on any more. */
export async function sweepExpiredLoginRequests(): Promise<void> {
  await prisma.loginRequest
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});
}
