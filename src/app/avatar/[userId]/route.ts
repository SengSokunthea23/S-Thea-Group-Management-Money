import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sniffImageType } from "@/lib/avatar";

/**
 * Serves a user's avatar.
 *
 * A route handler rather than a data URL on the user record: the sidebar draws
 * an avatar on every page, and inlining the bytes would push them through the
 * RSC payload on every navigation. Here the browser fetches them once and
 * caches them.
 *
 * Readable by any signed-in member, which matches what the Members table shows.
 * It is behind the session check all the same — an avatar is a photograph of a
 * person, and there is no reason to let the open internet enumerate them.
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/avatar/[userId]">,
) {
  const viewer = await getCurrentUser();
  if (!viewer) {
    return new Response(null, { status: 401 });
  }

  const { userId } = await ctx.params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarData: true, avatarType: true, avatarUpdatedAt: true },
  });

  if (!user?.avatarData || !user.avatarUpdatedAt) {
    return new Response(null, { status: 404 });
  }

  const bytes = new Uint8Array(user.avatarData);

  // The stored Content-Type is re-derived from the bytes rather than trusted
  // from the column. Belt and braces — the upload path already sniffs — but it
  // means no future write path can cause this handler to mislabel a response.
  const contentType = sniffImageType(bytes) ?? "application/octet-stream";

  return new Response(bytes, {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(bytes.byteLength),
      // Safe to cache hard because the URL carries ?v=<avatarUpdatedAt>:
      // replacing the picture changes the URL, so nothing stale survives.
      "Cache-Control": "private, max-age=31536000, immutable",
      // A photo is not a document to be framed or sniffed into something else.
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
