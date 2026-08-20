import { barPercent, type MonthBucket } from "@/lib/analysis";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { ENTRY_TYPES, entryTypeLabel, type EntryType } from "@/lib/finance";
import type { Translator } from "@/lib/i18n/translate";

/**
 * Three series — income, expenses, savings — as grouped bars per month.
 *
 * Grouped rather than stacked: the question this chart answers is "how do the
 * three compare in a given month", and a stack makes every segment but the
 * bottom one start from a different baseline, which is exactly the comparison
 * you need. All three share one y-scale so the heights are commensurable.
 *
 * Hover is pure CSS, which keeps the dashboard a server component.
 */

const SERIES_FILL: Record<EntryType, string> = {
  INCOME: "bg-[var(--badge-emerald-fg)]",
  EXPENSE: "bg-[var(--badge-rose-fg)]",
  SAVING: "bg-accent",
};

export function TrendChart({
  buckets,
  totals,
  t,
}: {
  buckets: MonthBucket[];
  totals: Record<EntryType, number>;
  t: Translator;
}) {
  // One scale across all three series, so a tall income bar and a short expense
  // bar in the same month mean what they look like they mean.
  const max = Math.max(
    ...buckets.flatMap((bucket) => ENTRY_TYPES.map((type) => bucket.totals[type])),
    0,
  );

  const first = buckets[0];
  const last = buckets[buckets.length - 1];

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border px-5 py-3">
        <div>
          <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
            {t("dashboard.trendTitle")}
          </h2>
          <p className="mt-0.5 text-[13px] text-muted">
            {t("dashboard.trendSubtitle", {
              from: first.label,
              to: last.label,
            })}
          </p>
        </div>

        {/* Three series need a legend — the heading can't name them all. */}
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {ENTRY_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-1.5 text-[13px]">
              <span
                className={`size-2.5 shrink-0 rounded-[3px] ${SERIES_FILL[type]}`}
                aria-hidden="true"
              />
              <span className="text-muted">{entryTypeLabel(t, type)}</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(totals[type])}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="px-5 py-5">
        {max === 0 ? (
          <p className="py-10 text-center text-sm text-muted">
            {t("dashboard.trendEmpty")}
          </p>
        ) : (
          <div className="flex gap-3">
            {/* Recessive y-axis: three references, nothing more. */}
            <div className="flex h-48 w-12 shrink-0 flex-col justify-between text-right text-[11px] text-muted tabular-nums">
              <span>{formatCompactCurrency(max)}</span>
              <span>{formatCompactCurrency(max / 2)}</span>
              <span>{formatCompactCurrency(0)}</span>
            </div>

            <div className="min-w-0 flex-1">
              <div
                role="img"
                aria-label={t("dashboard.trendLabel", {
                  from: first.label,
                  to: last.label,
                  income: formatCurrency(totals.INCOME),
                  expenses: formatCurrency(totals.EXPENSE),
                  savings: formatCurrency(totals.SAVING),
                })}
                className="relative h-48"
              >
                {/* Gridlines sit behind the marks and stay faint. */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
                  <div className="border-t border-border" />
                  <div className="border-t border-border" />
                  <div className="border-t border-border" />
                </div>

                <div className="absolute inset-0 flex items-end gap-1.5">
                  {buckets.map((bucket) => (
                    <div
                      key={bucket.key}
                      className="group relative flex h-full min-w-0 flex-1 items-end justify-center gap-px"
                    >
                      {/* Tooltip — CSS only, no client JS. */}
                      <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1.5 hidden w-max -translate-x-1/2 rounded-md border border-border bg-surface px-2 py-1.5 shadow-md group-hover:block">
                        <div className="text-[11px] text-muted">
                          {bucket.label}
                        </div>
                        <dl className="mt-0.5 space-y-0.5">
                          {ENTRY_TYPES.map((type) => (
                            <div
                              key={type}
                              className="flex items-center justify-between gap-3 text-xs"
                            >
                              <dt className="flex items-center gap-1.5 text-muted">
                                <span
                                  className={`size-2 rounded-[2px] ${SERIES_FILL[type]}`}
                                  aria-hidden="true"
                                />
                                {entryTypeLabel(t, type)}
                              </dt>
                              <dd className="font-medium tabular-nums">
                                {formatCurrency(bucket.totals[type])}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </div>

                      {ENTRY_TYPES.map((type) => (
                        <div
                          key={type}
                          style={{
                            height: `${barPercent(bucket.totals[type], max)}%`,
                          }}
                          className={`min-w-0 flex-1 rounded-t-[3px] opacity-80 transition-opacity group-hover:opacity-100 ${SERIES_FILL[type]}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-2 flex gap-1.5">
                {buckets.map((bucket) => (
                  <div
                    key={bucket.key}
                    className="min-w-0 flex-1 text-center text-[11px] text-muted"
                  >
                    {bucket.shortLabel}
                    {bucket.isYearStart ? (
                      <span className="block text-[10px]">{bucket.year}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table view: the same numbers, available to screen readers. */}
        <table className="sr-only">
          <caption>{t("dashboard.trendTableCaption")}</caption>
          <thead>
            <tr>
              <th scope="col">{t("dashboard.columnMonth")}</th>
              {ENTRY_TYPES.map((type) => (
                <th key={type} scope="col">
                  {entryTypeLabel(t, type)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {buckets.map((bucket) => (
              <tr key={bucket.key}>
                <th scope="row">{bucket.label}</th>
                {ENTRY_TYPES.map((type) => (
                  <td key={type}>{formatCurrency(bucket.totals[type])}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
