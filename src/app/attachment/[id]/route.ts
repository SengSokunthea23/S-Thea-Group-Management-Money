import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sniffAttachmentType } from "@/lib/attachment";

/**
 * Serves one receipt or invoice.
 *
 * Unlike avatars, which any signed-in member may see, a receipt is private to
 * the person who filed it — so the lookup is scoped by `userId` and someone
 * else's id simply 404s rather than 403s. A 403 would confirm the row exists.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/attachment/[id]">,
) {
  const viewer = await getCurrentUser();
  if (!viewer) return new Response(null, { status: 401 });

  const { id } = await ctx.params;

  const attachment = await prisma.attachment.findFirst({
    where: { id, userId: viewer.id },
    select: { data: true, fileName: true },
  });

  if (!attachment) return new Response(null, { status: 404 });

  const bytes = new Uint8Array(attachment.data);

  // Re-derived from the bytes rather than trusted from the column, so no write
  // path can cause this handler to mislabel a response.
  const contentType = sniffAttachmentType(bytes) ?? "application/octet-stream";

  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      // Attachments are immutable: editing an entry replaces rows rather than
      // rewriting bytes, so an id always denotes the same file.
      "Cache-Control": "private, max-age=31536000, immutable",
      // `inline` so a receipt opens in a tab instead of downloading. The
      // filename is sanitised at upload, and quoted here so a space in it
      // cannot end the header value early.
      "Content-Disposition": attachment.fileName
        ? `inline; filename="${attachment.fileName.replace(/"/g, "")}"`
        : "inline",
      // A PDF served from our own origin should not be sniffed into anything
      // else, and nothing here should be framed.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
