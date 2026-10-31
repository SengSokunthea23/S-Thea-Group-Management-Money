"use client";

import { useState } from "react";
import { BarChart3, LineChart as LineChartIcon } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatCompactCurrency, formatCurrency } from "@/lib/format";

export type TrendPoint = {
  key: string;
  /** Axis label, e.g. "Aug". */
  month: string;
  /** Tooltip heading, e.g. "August 2026". */
  label: string;
  INCOME: number;
  EXPENSE: number;
  SAVING: number;
};

/**
 * Colours reuse the badge tokens the rest of the app already themes, so the
 * chart follows light/dark with no extra variables.
 */
const COLORS = {
  INCOME: "var(--badge-emerald-fg)",
  EXPENSE: "var(--badge-rose-fg)",
  SAVING: "var(--accent)",
} as const;

export function TrendChartView({
  data,
  labels,
  barLabel,
  lineLabel,
  ariaLabel,
}: {
  data: TrendPoint[];
  labels: Record<"INCOME" | "EXPENSE" | "SAVING", string>;
  barLabel: string;
  lineLabel: string;
  ariaLabel: string;
}) {
  const [kind, setKind] = useState<"bar" | "line">("bar");

  const config = {
    INCOME: { label: labels.INCOME, color: COLORS.INCOME },
    EXPENSE: { label: labels.EXPENSE, color: COLORS.EXPENSE },
    SAVING: { label: labels.SAVING, color: COLORS.SAVING },
  } satisfies ChartConfig;

  const shared = (
    <>
      <CartesianGrid vertical={false} />
      <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
      <YAxis
        width={48}
        tickLine={false}
        axisLine={false}
        tickFormatter={(value: number) => formatCompactCurrency(value)}
      />
      <ChartTooltip
        content={
          <ChartTooltipContent
            labelFormatter={(_, payload) => payload?.[0]?.payload?.label}
            formatter={(value, name) => (
              <div className="flex w-full items-center justify-between gap-3">
                <span className="text-muted">{config[name as keyof typeof config]?.label}</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(Number(value))}
                </span>
              </div>
            )}
          />
        }
      />
      <ChartLegend content={<ChartLegendContent />} />
    </>
  );

  return (
    <div>
      <div className="mb-3 flex justify-end gap-1">
        <Button
          variant={kind === "bar" ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={kind === "bar"}
          onClick={() => setKind("bar")}
        >
          <BarChart3 />
          {barLabel}
        </Button>
        <Button
          variant={kind === "line" ? "secondary" : "ghost"}
          size="sm"
          aria-pressed={kind === "line"}
          onClick={() => setKind("line")}
        >
          <LineChartIcon />
          {lineLabel}
        </Button>
      </div>

      <ChartContainer config={config} className="h-56 w-full" role="img" aria-label={ariaLabel}>
        {kind === "bar" ? (
          <BarChart data={data} accessibilityLayer>
            {shared}
            <Bar dataKey="INCOME" fill="var(--color-INCOME)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="EXPENSE" fill="var(--color-EXPENSE)" radius={[3, 3, 0, 0]} />
            <Bar dataKey="SAVING" fill="var(--color-SAVING)" radius={[3, 3, 0, 0]} />
          </BarChart>
        ) : (
          <LineChart data={data} accessibilityLayer>
            {shared}
            <Line dataKey="INCOME" type="monotone" stroke="var(--color-INCOME)" strokeWidth={2} dot={false} />
            <Line dataKey="EXPENSE" type="monotone" stroke="var(--color-EXPENSE)" strokeWidth={2} dot={false} />
            <Line dataKey="SAVING" type="monotone" stroke="var(--color-SAVING)" strokeWidth={2} dot={false} />
          </LineChart>
        )}
      </ChartContainer>
    </div>
  );
}
