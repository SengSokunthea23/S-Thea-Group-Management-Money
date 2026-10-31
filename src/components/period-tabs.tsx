"use client";

import Link from "next/link";
import { useT } from "@/components/i18n-provider";
import { PERIODS, type Period } from "@/lib/analysis";

const LABEL_KEYS = {
  month: "period.month",
  quarter: "period.quarter",
  year: "period.year",
  all: "period.all",
} as const;

/**
 * The reporting window, as links rather than buttons.
 *
 * Putting it in the URL keeps the dashboard a server component — no client
 * state, no refetch, no loading flicker — and makes a particular view something
 * you can bookmark or paste to someone. `scroll={false}` stops the page jumping
 * to the top when you are comparing two periods.
 */
export function PeriodTabs({ current }: { current: Period }) {
  const t = useT();

  return (
    // The negative margin plus matching padding lets the focus ring on the
    // first and last tab breathe without being clipped by the scroll box.
    <nav
      aria-label={t("period.label")}
      className="scroll-strip -mx-1 max-w-full overflow-x-auto overflow-y-hidden px-1"
    >
      <div className="flex w-max gap-0.5 rounded-md bg-sunken p-0.5">
        {PERIODS.map((period) => {
          const active = period === current;

          return (
            <Link
              key={period}
              href={`/?period=${period}`}
              scroll={false}
              aria-current={active ? "page" : undefined}
              className={`whitespace-nowrap rounded-[5px] px-2.5 py-1 text-xs font-medium transition-colors ${
                active
                  ? "bg-surface text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              {t(LABEL_KEYS[period])}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
