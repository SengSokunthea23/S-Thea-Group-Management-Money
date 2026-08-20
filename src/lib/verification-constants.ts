// Constants shared by the server-side code machinery and the forms that collect
// the codes. Split out of src/lib/verification.ts because that module is
// `server-only` — it touches the database and the SMS sender — and a client
// component importing it would fail the build.

export const CODE_PURPOSES = ["PASSWORD_RESET", "PHONE_VERIFY"] as const;

export type CodePurpose = (typeof CODE_PURPOSES)[number];

export const CODE_LENGTH = 6;

/** How long a code is worth anything. */
export const CODE_TTL_MS = 10 * 60 * 1000;

/** Wrong guesses against one code before it is burned. */
export const MAX_ATTEMPTS = 5;
