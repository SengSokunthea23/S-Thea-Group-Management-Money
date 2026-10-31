/**
 * Receipts and invoices attached to an expense.
 *
 * Two kinds, handled differently on the way in:
 *
 *   - **Images** are photographs of paper. The browser downscales them before
 *     upload, because a phone camera produces several megabytes of a slip that
 *     only ever needs to be legible.
 *   - **PDFs** are invoices, which arrive already digital. They pass through
 *     untouched — re-encoding a PDF in a canvas would turn text into pixels —
 *     so they carry a larger cap instead.
 */

export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export const ACCEPTED_DOC_TYPES = ["application/pdf"] as const;

export type AttachmentType =
  | (typeof ACCEPTED_IMAGE_TYPES)[number]
  | (typeof ACCEPTED_DOC_TYPES)[number];

export const ATTACHMENT_ACCEPT = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_DOC_TYPES,
].join(",");

/** Long edge the browser downscales a photographed receipt to. */
export const RECEIPT_MAX_EDGE = 1600;

/** 1 MB — generous for a 1600px JPEG of a receipt. */
export const MAX_IMAGE_BYTES = 1024 * 1024;

/** 4 MB — a multi-page invoice, without inviting someone to store a film. */
export const MAX_PDF_BYTES = 4 * 1024 * 1024;

/** How many receipts one expense may carry. */
export const MAX_ATTACHMENTS_PER_ENTRY = 6;

export function isImageType(mimeType: string): boolean {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(mimeType);
}

export function maxBytesFor(mimeType: string): number {
  return isImageType(mimeType) ? MAX_IMAGE_BYTES : MAX_PDF_BYTES;
}

/**
 * Identifies the format from the file's own leading bytes.
 *
 * The `type` a browser reports is a claim, and `accept` on an <input> filters
 * the picker rather than guaranteeing anything. These bytes are later served
 * back under a Content-Type we choose, so trusting the claim would let someone
 * store one thing and have it served as another.
 */
export function sniffAttachmentType(bytes: Uint8Array): AttachmentType | null {
  // JPEG: FF D8 FF
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
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

  // PDF: "%PDF-"
  if (
    bytes.length >= 5 &&
    String.fromCharCode(...bytes.subarray(0, 5)) === "%PDF-"
  ) {
    return "application/pdf";
  }

  return null;
}

/** "1.2 MB". Locale-independent on purpose — a byte count is not prose. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Where the bytes are served from. Ownership is checked by the route. */
export function attachmentUrl(id: string): string {
  return `/attachment/${id}`;
}

const CONTROL_MAX = 0x1f;
const DELETE_CHAR = 0x7f;

/**
 * Filenames are user-supplied and end up in a `Content-Disposition` header,
 * where a stray newline is header injection. Written as an explicit codepoint
 * filter rather than a regex so the intent survives being read.
 */
export function safeFileName(name: string): string | null {
  const cleaned = [...name]
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return code > CONTROL_MAX && code !== DELETE_CHAR;
    })
    .join("")
    // Path separators have no business in a stored display name.
    .split("\\")
    .join("-")
    .split("/")
    .join("-")
    .trim();

  if (!cleaned) return null;
  return cleaned.length > 120 ? cleaned.slice(0, 120) : cleaned;
}
