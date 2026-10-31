import type { MonthBucket } from "@/lib/analysis";
import { formatCurrency } from "@/lib/format";
import { ENTRY_TYPES, entryTypeLabel, type EntryType } from "@/lib/finance";
import type { Translator } from "@/lib/i18n/translate";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendChartView } from "./trend-chart-view";

/**
 * Server wrapper: resolves every string through `t` here, because a translator
 * function cannot cross into the client chart. The chart itself is Recharts via
 * the shadcn `ChartContainer`.
 */
export function TrendChart({
  buckets,
  totals,
  t,
}: {
  buckets: MonthBucket[];
  totals: Record<EntryType, number>;
  t: Translator;
}) {
  const first = buckets[0];
  const last = buckets[buckets.length - 1];
  const hasData = buckets.some((bucket) =>
    ENTRY_TYPES.some((type) => bucket.totals[type] > 0),
  );

  const labels = {
    INCOME: entryTypeLabel(t, "INCOME"),
    EXPENSE: entryTypeLabel(t, "EXPENSE"),
    SAVING: entryTypeLabel(t, "SAVING"),
  };

  const data = buckets.map((bucket) => ({
    key: bucket.key,
    month: bucket.shortLabel,
    label: bucket.label,
    INCOME: bucket.totals.INCOME,
    EXPENSE: bucket.totals.EXPENSE,
    SAVING: bucket.totals.SAVING,
  }));

  return (
    <Card className="gap-0 py-0">
      <CardHeader className="border-b py-3">
        <CardTitle className="text-xs font-medium tracking-wide text-muted uppercase">
          {t("dashboard.trendTitle")}
        </CardTitle>
        <CardDescription>
          {t("dashboard.trendSubtitle", { from: first.label, to: last.label })}
        </CardDescription>
      </CardHeader>

      <CardContent className="py-5">
        {hasData ? (
          <TrendChartView
            data={data}
            labels={labels}
            barLabel={t("dashboard.chartBar")}
            lineLabel={t("dashboard.chartLine")}
            ariaLabel={t("dashboard.trendLabel", {
              from: first.label,
              to: last.label,
              income: formatCurrency(totals.INCOME),
              expenses: formatCurrency(totals.EXPENSE),
              savings: formatCurrency(totals.SAVING),
            })}
          />
        ) : (
          <p className="py-10 text-center text-sm text-muted">
            {t("dashboard.trendEmpty")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
