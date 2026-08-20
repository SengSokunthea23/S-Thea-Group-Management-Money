"use client";

import { useId, useState } from "react";
import { barPercent, type MonthBucket } from "@/lib/analysis";
import { useT } from "@/components/i18n-provider";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";
import { ENTRY_TYPES, entryTypeLabel, type EntryType } from "@/lib/finance";

/**
 * Income, expenses and savings over twelve months, drawn either way.
 *
 * **Bars** answer "how did the three compare *in* a given month" — three
 * columns off a shared baseline, which is the comparison a reader makes by eye.
 * Grouped rather than stacked, because a stack starts every segment but the
 * bottom one at a different height and so destroys exactly that comparison.
 *
 * **Lines** answer "which way is each of them going" — continuity across months
 * that a set of separate columns cannot show. Same data, same scale, different
 * question, which is why both are worth having rather than one being the better
 * chart.
 *
 * All three series share one y-axis in both modes, so a tall income mark and a
 * short expense mark in the same month mean what they look like they mean.
 */

type ChartMode = "bars" | "line";

const SERIES_FILL: Record<EntryType, string> = {
  INCOME: "bg-[var(--badge-emerald-fg)]",
  EXPENSE: "bg-[var(--badge-rose-fg)]",
  SAVING: "bg-accent",
};

/** SVG needs a paintable colour, not a Tailwind background utility. */
const SERIES_STROKE: Record<EntryType, string> = {
  INCOME: "var(--badge-emerald-fg)",
  EXPENSE: "var(--badge-rose-fg)",
  SAVING: "var(--accent)",
};

export function TrendChart({
  buckets,
  totals,
}: {
  buckets: MonthBucket[];
  totals: Record<EntryType, number>;
}) {
  const t = useT();
  const [mode, setMode] = useState<ChartMode>("bars");

  const max = Math.max(
    ...buckets.flatMap((bucket) => ENTRY_TYPES.map((type) => bucket.totals[type])),
    0,
  );

  const first = buckets[0];
  const last = buckets[buckets.length - 1];

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3 border-b border-border px-5 py-3">
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

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
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

          <ModeToggle mode={mode} onChange={setMode} />
        </div>
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

                {mode === "bars" ? (
                  <Bars buckets={buckets} max={max} />
                ) : (
                  <Lines buckets={buckets} max={max} />
                )}

                {/*
                  One hover strip per month, shared by both modes and sitting
                  above them. Keeping the tooltip out of the marks means the
                  line chart gets the same hover target as the bars — on a line
                  the marks themselves are a few pixels wide and nearly
                  impossible to hit.
                */}
                <div className="absolute inset-0 flex">
                  {buckets.map((bucket, index) => (
                    <div
                      key={bucket.key}
                      className="group relative min-w-0 flex-1"
                    >
                      {/*
                        Anchored inside the plot, not above it.

                        `bottom-full` put the card in the space above the chart,
                        which is where the heading and the legend live — reading
                        one month's figures hid the totals for all three series.
                        Sitting at the top of the plot keeps it within the panel
                        and covers only chart area, which is the part you are
                        already reading numerically.

                        The horizontal anchor shifts at the ends: a centred card
                        on the first or last month hangs off the side of the
                        panel, so those columns pin theirs to the near edge
                        instead.
                      */}
                      <div
                        className={`pointer-events-none absolute top-1 z-10 hidden w-max rounded-md border border-border bg-surface px-2 py-1.5 shadow-md group-hover:block ${
                          index <= 1
                            ? "left-0"
                            : index >= buckets.length - 2
                              ? "right-0"
                              : "left-1/2 -translate-x-1/2"
                        }`}
                      >
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

                      {/*
                        The highlight marking the hovered month, which has to
                        be translucent either way: this strip sits *above* the
                        marks, so that a line chart gets a target wider than
                        its two-pixel stroke, and a solid fill here paints over
                        the very data the reader is trying to read.

                        Bars fill a column each, so a column-shaped wash lands
                        on the thing it refers to. A line has no column — its
                        value is a single point on a vertical — so the same
                        wash there is a tall slab of colour hanging off a
                        hairline. It gets a rule through the column centre
                        instead, where the dots sit, which is how a reader
                        already traces a value down to its month.
                      */}
                      {mode === "bars" ? (
                        <div className="size-full rounded-[3px] bg-gradient-to-b from-accent/25 via-accent/10 to-accent/0 opacity-0 ring-1 ring-accent/30 ring-inset transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none" />
                      ) : (
                        <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-accent/60 opacity-0 transition-opacity duration-150 group-hover:opacity-100 motion-reduce:transition-none" />
                      )}
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

        {/* Table view: the same numbers, available to screen readers. It is the
            chart's real accessible content — a toggle between two pictures
            changes nothing for a reader who cannot see either. */}
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

function Bars({ buckets, max }: { buckets: MonthBucket[]; max: number }) {
  return (
    <div className="absolute inset-0 flex items-end gap-1.5">
      {buckets.map((bucket) => (
        <div
          key={bucket.key}
          className="flex h-full min-w-0 flex-1 items-end justify-center gap-px"
        >
          {ENTRY_TYPES.map((type) => (
            <div
              key={type}
              style={{ height: `${barPercent(bucket.totals[type], max)}%` }}
              className={`min-w-0 flex-1 rounded-t-[3px] opacity-80 ${SERIES_FILL[type]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Three lines over a shared baseline, each with a soft area beneath it.
 *
 * `preserveAspectRatio="none"` lets a 0-100 coordinate space fill whatever the
 * container happens to be, so no measurement and no resize listener is needed.
 * The cost is that everything inside scales unevenly: `vector-effect` cancels
 * that for the strokes, and the dots are placed outside the SVG entirely - see
 * the note below.
 *
 * Points sit at the *centre* of each month's column rather than spread edge to
 * edge. Edge to edge is what a continuous signal wants, but this chart is
 * twelve discrete months: with the old spacing the mark for a month sat half a
 * column away from that month's label and from the strip that reveals its
 * figures, so pointing at a spike read out the neighbouring month.
 */
function Lines({ buckets, max }: { buckets: MonthBucket[]; max: number }) {
  /* Gradients are referenced by id, and ids are global to the document. */
  const gradientId = useId();
  const step = 100 / buckets.length;
  const x = (index: number) => (index + 0.5) * step;
  const y = (type: EntryType, bucket: MonthBucket) =>
    100 - (max > 0 ? bucket.totals[type] / max : 0) * 100;

  const pointsFor = (type: EntryType) =>
    buckets.map((bucket, index) => `${x(index)},${y(type, bucket)}`).join(" ");

  /* The same points closed down to the baseline, so the line can be filled. */
  const areaFor = (type: EntryType) =>
    `M ${x(0)},100 L ${pointsFor(type).replaceAll(" ", " L ")} L ${x(buckets.length - 1)},100 Z`;

  return (
    <>
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="absolute inset-0 size-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {ENTRY_TYPES.map((type) => (
            /*
              Vertical fade in user space, not bounding-box space: a bounding
              box here is the extent of one path, so a flat series would get
              the whole gradient compressed into a couple of pixels and read
              far darker than a tall one.
            */
            <linearGradient
              key={type}
              id={`${gradientId}-${type}`}
              gradientUnits="userSpaceOnUse"
              x1="0"
              y1="0"
              x2="0"
              y2="100"
            >
              <stop
                offset="0%"
                stopColor={SERIES_STROKE[type]}
                stopOpacity="0.22"
              />
              <stop
                offset="100%"
                stopColor={SERIES_STROKE[type]}
                stopOpacity="0"
              />
            </linearGradient>
          ))}
        </defs>

        {/*
          Areas first, all three of them, then every stroke on top. Drawn
          series by series instead, a later month's fill would wash over an
          earlier series' line and dull it.
        */}
        {ENTRY_TYPES.map((type) => (
          <path
            key={type}
            d={areaFor(type)}
            fill={`url(#${gradientId}-${type})`}
            stroke="none"
          />
        ))}

        {ENTRY_TYPES.map((type) => (
          <polyline
            key={type}
            points={pointsFor(type)}
            fill="none"
            stroke={SERIES_STROKE[type]}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>

      {/*
        A dot per month, positioned in percentages *outside* the SVG.

        They cannot live in it: the stretched viewBox scales x and y by
        different factors - twelvefold against roughly twofold at a typical
        width - so a circle drawn there comes out an ellipse. `vector-effect`
        does not help, since it corrects strokes and these are fills. Placed
        here they are ordinary boxes with a fixed pixel size, so they stay
        round at every width.

        They earn their place: an isolated month between two zeroes is a spike
        that a bare polyline draws as a hairline and the eye slides straight
        past. The ring in the page colour separates the three where they land
        on the same value - which, at zero, is most months.
      */}
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {ENTRY_TYPES.map((type) =>
          buckets.map((bucket, index) => (
            <span
              key={`${type}-${bucket.key}`}
              style={{
                left: `${x(index)}%`,
                top: `${y(type, bucket)}%`,
                backgroundColor: SERIES_STROKE[type],
              }}
              className="absolute size-[7px] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface"
            />
          )),
        )}
      </div>
    </>
  );
}

const MODES: { value: ChartMode; label: "dashboard.chartBars" | "dashboard.chartLine" }[] = [
  { value: "bars", label: "dashboard.chartBars" },
  { value: "line", label: "dashboard.chartLine" },
];

function ModeToggle({
  mode,
  onChange,
}: {
  mode: ChartMode;
  onChange: (mode: ChartMode) => void;
}) {
  const t = useT();

  return (
    <div
      role="group"
      aria-label={t("dashboard.chartType")}
      className="flex shrink-0 gap-0.5 rounded-md bg-sunken p-0.5"
    >
      {MODES.map((option) => {
        const active = option.value === mode;
        const label = t(option.label);

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            title={label}
            className={`flex size-7 items-center justify-center rounded-[5px] transition-colors ${
              active
                ? "bg-surface text-text shadow-sm"
                : "text-muted hover:text-text"
            }`}
          >
            {option.value === "bars" ? <BarsIcon /> : <LineIcon />}
            <span className="sr-only">{label}</span>
          </button>
        );
      })}
    </div>
  );
}

function BarsIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M4.5 16.5V9M10 16.5V4.5M15.5 16.5v-5" />
    </svg>
  );
}

function LineIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 14.5l4-5 3.5 3 6-7.5" />
    </svg>
  );
}
