import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

// Deliberately free of `server-only` and Prisma so the seed script can import
// it directly. Session handling lives in src/lib/auth.ts.

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

/**
 * scrypt from node:crypto rather than bcrypt/argon2: no native build step, and
 * it's a memory-hard KDF, which is the property that matters.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt:${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const [scheme, saltHex, hashHex] = stored.split(":");
  const wellFormed = scheme === "scrypt" && !!saltHex && !!hashHex;

  // The KDF runs even for a malformed hash, so callers can pass a dummy value
  // for an unknown email and still burn comparable time.
  const salt = wellFormed
    ? Buffer.from(saltHex, "hex")
    : randomBytes(SALT_LENGTH);
  const derived = await scryptAsync(password, salt, KEY_LENGTH);

  if (!wellFormed) return false;

  const expected = Buffer.from(hashHex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  // Constant-time compare so response timing doesn't leak the hash.
  return timingSafeEqual(derived, expected);
}
