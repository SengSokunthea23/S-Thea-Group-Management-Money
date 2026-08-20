/**
 * Avatar rules, shared by the upload form and the server action that stores it.
 *
 * The browser resizes the picture before it is sent (see avatar-field.tsx), so
 * these limits are a backstop rather than the normal path — a request that hits
 * them is one that skipped the form.
 */

/** 512 KB. Comfortably above a 256px JPEG, far below anything alarming. */
export const MAX_AVATAR_BYTES = 512 * 1024;

/** Edge length the browser downscales to before uploading. */
export const AVATAR_SIZE = 256;

export const ACCEPTED_AVATAR_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AvatarType = (typeof ACCEPTED_AVATAR_TYPES)[number];

/** The `accept` attribute for the file input. */
export const AVATAR_ACCEPT = ACCEPTED_AVATAR_TYPES.join(",");

/**
 * Identifies the format from the file's own leading bytes.
 *
 * The `type` a browser reports is just a claim, and `accept` on an <input> is a
 * filter for the picker, not a guarantee. Since these bytes are later served
 * back with a Content-Type we choose, trusting the claim would let someone
 * store one thing and have it served as another — so the file is asked what it
 * is instead of being taken at its word.
 */
export function sniffImageType(bytes: Uint8Array): AvatarType | null {
  // JPEG: FF D8 FF
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length >= 8 && PNG.every((byte, index) => bytes[index] === byte)) {
    return "image/png";
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}

/** Initials for the placeholder shown when there is no picture. */
export function initialsOf(name: string): string {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "?"
  );
}

/**
 * The avatar URL, or null when the user has none.
 *
 * `avatarUpdatedAt` rides along as a version so a replaced picture appears
 * immediately: the bytes are served with a long immutable cache, which without
 * a changing URL would pin the old face in place for a year.
 */
export function avatarUrl(
  userId: string,
  avatarUpdatedAt: Date | null,
): string | null {
  if (!avatarUpdatedAt) return null;
  return `/avatar/${userId}?v=${avatarUpdatedAt.getTime()}`;
}
