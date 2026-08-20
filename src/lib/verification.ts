import "server-only";

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { getSmsSender } from "@/lib/sms";
import {
  CODE_LENGTH,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  type CodePurpose,
} from "@/lib/verification-constants";

export {
  CODE_LENGTH,
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  CODE_PURPOSES,
  type CodePurpose,
} from "@/lib/verification-constants";

/**
 * One-time codes sent to a phone.
 *
 * A six-digit code is a million possibilities, which is only a real secret while
 * guessing is bounded. Three limits do that work together, and none of them is
 * optional:
 *
 *   - `CODE_TTL_MS`      — the window in which a code is worth anything
 *   - `MAX_ATTEMPTS`     — wrong guesses against one code before it dies
 *   - `MAX_SENDS_PER_WINDOW` — codes issued per account, so an attacker cannot
 *                          simply mint fresh ones to reset the attempt counter
 */

const SEND_WINDOW_MS = 15 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 3;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * `randomInt` rather than `Math.random`: this is a credential, and the
 * predictability of a PRNG seeded from the clock is exactly the property an
 * attacker wants. Zero-padded so every code is the same length.
 */
function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_LENGTH)).padStart(CODE_LENGTH, "0");
}

/** Constant-time compare, so response timing cannot leak a prefix match. */
function hashesMatch(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export type IssueResult =
  | { ok: true; code: string }
  | { ok: false; reason: "rate_limited" };

/**
 * Issues a code and sends it. Returns the plaintext so the caller can decide
 * whether to reveal it — only ever outside production, see CAN_REVEAL_CODES.
 *
 * Any earlier live code for the same purpose is consumed first: two valid codes
 * at once would double an attacker's guessing budget for no benefit to anyone.
 */
export async function issueCode(
  userId: string,
  purpose: CodePurpose,
  phone: string,
  body: (code: string) => string,
): Promise<IssueResult> {
  const now = new Date();

  const recent = await prisma.verificationCode.count({
    where: {
      userId,
      purpose,
      createdAt: { gt: new Date(now.getTime() - SEND_WINDOW_MS) },
    },
  });
  if (recent >= MAX_SENDS_PER_WINDOW) return { ok: false, reason: "rate_limited" };

  await prisma.verificationCode.updateMany({
    where: { userId, purpose, consumedAt: null },
    data: { consumedAt: now },
  });

  const code = generateCode();
  await prisma.verificationCode.create({
    data: {
      userId,
      purpose,
      codeHash: hashCode(code),
      expiresAt: new Date(now.getTime() + CODE_TTL_MS),
    },
  });

  await getSmsSender().send({ to: phone, body: body(code) });

  return { ok: true, code };
}

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: "invalid" | "expired" | "too_many_attempts" };

/**
 * Verifies a code and consumes it on success.
 *
 * A wrong guess costs an attempt whether or not a code even exists, and the
 * "no code at all" case is reported as `invalid` rather than something more
 * specific — the caller should not be able to tell a missing code from a wrong
 * one, since the difference reveals whether the account is mid-recovery.
 */
export async function checkCode(
  userId: string,
  purpose: CodePurpose,
  submitted: string,
): Promise<CheckResult> {
  const now = new Date();

  const record = await prisma.verificationCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!record) return { ok: false, reason: "invalid" };

  if (record.expiresAt <= now) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });
    return { ok: false, reason: "expired" };
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    await prisma.verificationCode.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });
    return { ok: false, reason: "too_many_attempts" };
  }

  const digits = submitted.replace(/\D/g, "");
  if (!hashesMatch(hashCode(digits), record.codeHash)) {
    const { attempts } = await prisma.verificationCode.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
      select: { attempts: true },
    });

    // Burn the code on the final miss rather than leaving a spent one live.
    if (attempts >= MAX_ATTEMPTS) {
      await prisma.verificationCode.update({
        where: { id: record.id },
        data: { consumedAt: now },
      });
      return { ok: false, reason: "too_many_attempts" };
    }

    return { ok: false, reason: "invalid" };
  }

  await prisma.verificationCode.update({
    where: { id: record.id },
    data: { consumedAt: now },
  });

  return { ok: true };
}

/** Housekeeping: drop codes nobody can use any more. */
export async function sweepExpiredCodes(): Promise<void> {
  await prisma.verificationCode
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .catch(() => {});
}
