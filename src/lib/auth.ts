import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  MAX_IP_LENGTH,
  MAX_USER_AGENT_LENGTH,
  truncate,
} from "@/lib/device";

export { hashPassword, verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "crm_session";
const SESSION_DAYS = 30;

/**
 * How stale `lastSeenAt` is allowed to get. Every request would otherwise write
 * to the session row to maintain a column that is read on exactly one screen —
 * five minutes is precise enough to tell a live device from an abandoned one.
 */
const TOUCH_INTERVAL_MS = 5 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  /** Non-null iff the user has a picture; also its cache-busting version. */
  avatarUpdatedAt: Date | null;
};

/**
 * Reads the request's device fingerprint for display on Settings → Devices.
 *
 * Descriptive only. Both values are attacker-controlled headers, so they are
 * capped, stored verbatim, and never consulted when deciding whether a session
 * is valid — that rests on the token hash alone.
 */
async function readDeviceHeaders(): Promise<{
  userAgent: string | null;
  ipAddress: string | null;
}> {
  const store = await headers();

  // x-forwarded-for is a comma-separated chain; the client is the first entry.
  const forwarded = store.get("x-forwarded-for")?.split(",")[0] ?? null;
  const ip = forwarded ?? store.get("x-real-ip");

  return {
    userAgent: truncate(store.get("user-agent"), MAX_USER_AGENT_LENGTH),
    ipAddress: truncate(ip, MAX_IP_LENGTH),
  };
}

/**
 * Creates a session row and returns the raw token for the cookie. Only the
 * token's hash is persisted, so a leaked database can't be used to mint a
 * valid cookie.
 */
export async function createSession(userId: string): Promise<{
  token: string;
  expiresAt: Date;
}> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const device = await readDeviceHeaders();

  await prisma.session.create({
    data: { id: hashToken(token), userId, expiresAt, ...device },
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * Resolves the signed-in user, or null. Wrapped in React `cache` so multiple
 * calls within one request hit the database once.
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const id = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id },
    select: {
      expiresAt: true,
      lastSeenAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUpdatedAt: true,
        },
      },
    },
  });

  if (!session) return null;

  // Expired sessions are treated as absent and swept on the way past.
  if (session.expiresAt.getTime() <= Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }

  // Throttled so an active tab doesn't write on every navigation. Failures are
  // swallowed: a missed touch makes the Devices screen slightly stale, which is
  // never worth failing a page render over.
  if (Date.now() - session.lastSeenAt.getTime() > TOUCH_INTERVAL_MS) {
    await prisma.session
      .update({ where: { id }, data: { lastSeenAt: new Date() } })
      .catch(() => {});
  }

  return session.user;
});

/** The hashed id of the request's own session — the "this device" row. */
export const getCurrentSessionId = cache(async (): Promise<string | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return token ? hashToken(token) : null;
});

export async function destroySession(token: string | undefined) {
  if (!token) return;
  await prisma.session
    .delete({ where: { id: hashToken(token) } })
    .catch(() => {});
}
