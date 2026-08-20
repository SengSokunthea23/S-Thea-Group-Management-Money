import Link from "next/link";
import { barPercent, type Slice } from "@/lib/analysis";
import { formatCurrency } from "@/lib/format";

/**
 * A ranked bar list — "where the money went" and "where it came from" are the
 * same shape, so they are the same component.
 *
 * Bars rather than a pie: reading a share off a pie means comparing angles,
 * and the ordered comparison is the whole point here. Each row carries its own
 * percentage, so the exact figure never has to be estimated from the length.
 */
export function Breakdown({
  title,
  slices,
  empty,
  action,
  tone = "accent",
}: {
  title: string;
  slices: Slice[];
  empty: string;
  action?: { href: string; label: string };
  tone?: "accent" | "expense" | "income";
}) {
  // Scale to the largest row, not to the total: with eight categories, scaling
  // to the sum would leave every bar a stub.
  const max = Math.max(...slices.map((slice) => slice.valueCents), 0);

  const fill =
    tone === "expense"
      ? "bg-[var(--badge-rose-fg)]"
      : tone === "income"
        ? "bg-[var(--badge-emerald-fg)]"
        : "bg-accent";

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-3">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
          {title}
        </h2>
        {action ? (
          <Link
            href={action.href}
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            {action.label}
          </Link>
        ) : null}
      </div>

      {slices.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-3 px-5 py-4">
          {slices.map((slice) => (
            <li key={slice.key} className="space-y-1.5">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate text-sm font-medium">
                  {slice.label}
                </span>
                <span className="shrink-0 text-sm tabular-nums">
                  {formatCurrency(slice.valueCents)}
                  <span className="ml-2 text-muted">{slice.percent}%</span>
                </span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-track"
                role="presentation"
              >
                <div
                  className={`h-full rounded-full ${fill}`}
                  style={{ width: `${barPercent(slice.valueCents, max)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
