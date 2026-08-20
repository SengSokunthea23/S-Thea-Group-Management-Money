import { avatarUrl, initialsOf } from "@/lib/avatar";

/**
 * A user's picture, falling back to their initials.
 *
 * Plain `<img>` rather than `next/image`: the bytes come from our own route
 * handler, already downscaled to 256px at upload time and served immutable, so
 * the optimiser has nothing left to do but add a hop.
 */
export function Avatar({
  userId,
  name,
  avatarUpdatedAt,
  size = 32,
  className = "",
}: {
  userId: string;
  name: string;
  avatarUpdatedAt: Date | null;
  /** Rendered edge length in px. */
  size?: number;
  className?: string;
}) {
  const src = avatarUrl(userId, avatarUpdatedAt);
  const style = { width: size, height: size };

  if (src) {
    return (
      /* The optimiser has nothing to do here: these bytes are already a 256px
         square from our own route handler, served immutable and cache-busted
         by ?v=. Routing them through /_next/image would add a hop and a second
         copy on disk. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        // Decorative here: every place this appears sits beside the person's
        // name, so announcing it again would just be noise.
        alt=""
        width={size}
        height={size}
        style={style}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <span
      style={style}
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-avatar font-semibold text-avatar-fg ${className}`}
    >
      <span style={{ fontSize: Math.round(size * 0.36) }}>
        {initialsOf(name)}
      </span>
    </span>
  );
}
