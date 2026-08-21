import { redirect } from "next/navigation";
import { Breakdown } from "@/components/breakdown";
import { PageHeader } from "@/components/page-header";
import { PeriodTabs } from "@/components/period-tabs";
import { TrendChart } from "@/components/trend-chart";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatIsoDate } from "@/lib/date";
import { formatCurrency, formatNumber } from "@/lib/format";
import { getLocale, getT } from "@/lib/preferences";
import {
  bucketByMonth,
  emptyTotals,
  formatRelativeTime,
  periodStart,
  summarise,
  toPeriod,
  toSlices,
  type TypedTotals,
} from "@/lib/analysis";
import {
  ENTRY_TYPE_STYLES,
  bucketLabel,
  entryTypeLabel,
  toEntryType,
  toIsoDate,
} from "@/lib/finance";
import { BudgetPanel } from "@/components/budget-panel";
import { budgetProgress, type CategoryRecord } from "@/lib/expense";
import { ensureCategories } from "@/lib/expense-server";
import type { Translator } from "@/lib/i18n/translate";

export const metadata = { title: "Analysis" };

// Reads a mutable database — must render per request.
export const dynamic = "force-dynamic";

/**
 * The whole point of the app: the four figures — income, expenses, savings and
 * how many sources the income arrives from — measured over one period, with
 * enough context around each to make it mean something.
 */
export default async function AnalysisPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [locale, t, params] = await Promise.all([
    getLocale(),
    getT(),
    searchParams,
  ]);

  const period = toPeriod(params.period);
  const now = new Date();
  const start = periodStart(period, now);

  // The period scopes the four figures; the trend chart always covers twelve
  // months regardless, so it gets its own read.
  const inPeriod = {
    userId: user.id,
    ...(start ? { occurredOn: { gte: start } } : {}),
  };

  await ensureCategories(user.id);

  // Budgets are always a month-to-date question, whatever period the four
  // figures above are showing: a monthly limit measured over twelve months
  // would compare a cap against twelve times the spending.
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const [
    periodEntries,
    trendEntries,
    activeSources,
    recent,
    entryCount,
    budgetRows,
  ] = await Promise.all([
      prisma.entry.findMany({
        where: inPeriod,
        select: {
          type: true,
          amountCents: true,
          expenseCategory: { select: { id: true, name: true, tone: true } },
          source: { select: { name: true } },
        },
      }),
      prisma.entry.findMany({
        where: {
          userId: user.id,
          occurredOn: {
            gte: new Date(
              Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1),
            ),
          },
        },
        select: { type: true, amountCents: true, occurredOn: true },
      }),
      prisma.incomeSource.count({ where: { userId: user.id, active: true } }),
      prisma.entry.findMany({
        where: { userId: user.id },
        orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
        take: 6,
        select: {
          id: true,
          type: true,
          amountCents: true,
          occurredOn: true,
          category: true,
          note: true,
          createdAt: true,
          source: { select: { name: true } },
          expenseCategory: { select: { name: true, tone: true } },
        },
      }),
      prisma.entry.count({ where: inPeriod }),
      // Only categories that actually carry a budget — a meter without a limit
      // has nothing to measure.
      prisma.expenseCategory.findMany({
        where: { userId: user.id, active: true, budgetCents: { not: null } },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          budgetCents: true,
          tone: true,
          active: true,
          sortOrder: true,
          _count: { select: { entries: true } },
          entries: {
            where: { occurredOn: { gte: monthStart } },
            select: { amountCents: true },
          },
        },
      }),
    ]);

  // --- aggregate --------------------------------------------------------
  const totals: TypedTotals = emptyTotals();
  const byCategory = new Map<string, number>();
  const bySource = new Map<string, number>();

  for (const entry of periodEntries) {
    const type = toEntryType(entry.type);
    totals[type] += entry.amountCents;

    if (type === "EXPENSE") {
      // Spending whose category was deleted still counts toward the total; it
      // groups under a dash rather than vanishing from the breakdown.
      const name = entry.expenseCategory?.name ?? t("common.empty");
      byCategory.set(name, (byCategory.get(name) ?? 0) + entry.amountCents);
    }

    if (type === "INCOME") {
      // Entries whose source was detached still count toward income; they group
      // under a dash rather than silently vanishing from the breakdown.
      const name = entry.source?.name ?? t("common.empty");
      bySource.set(name, (bySource.get(name) ?? 0) + entry.amountCents);
    }
  }

  const summary = summarise(totals, activeSources);

  // Categories carry their own text now, so the key *is* the label.
  const expenseSlices = toSlices(byCategory, (key) => key);
  const incomeSlices = toSlices(bySource, (key) => key);

  const trendBuckets = bucketByMonth(
    trendEntries.map((entry) => ({
      type: toEntryType(entry.type),
      amountCents: entry.amountCents,
      occurredOn: entry.occurredOn,
    })),
    now,
    locale,
  );

  const trendTotals: TypedTotals = emptyTotals();
  for (const bucket of trendBuckets) {
    trendTotals.INCOME += bucket.totals.INCOME;
    trendTotals.EXPENSE += bucket.totals.EXPENSE;
    trendTotals.SAVING += bucket.totals.SAVING;
  }

  const budgets: CategoryRecord[] = budgetRows.map((row) => ({
    id: row.id,
    name: row.name,
    budgetCents: row.budgetCents,
    tone: row.tone,
    active: row.active,
    sortOrder: row.sortOrder,
    spentCents: row.entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    entryCount: row._count.entries,
  }));

  const overBudgetCount = budgets.filter(
    (category) =>
      budgetProgress(category.spentCents, category.budgetCents).status ===
      "over",
  ).length;

  // How lopsided the income is. One source at 100% is a different risk profile
  // from four at 25% each, which is why the count alone isn't the whole story.
  const topSourceShare =
    incomeSlices.length > 0 ? incomeSlices[0].percent : null;

  return (
    <>
      <PageHeader>
        {/* min-h rather than a fixed h-16: four period labels in Khmer are far
            wider than in English, and on a narrow screen the row needs to wrap
            instead of pushing the page into a horizontal scroll. */}
        <div className="flex min-h-16 flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-8">
          <h1 className="text-[15px] font-semibold tracking-tight">
            {t("dashboard.title")}
          </h1>
          <PeriodTabs current={period} />
        </div>
      </PageHeader>

      <div className="space-y-6 px-4 py-6 sm:px-8 sm:py-8">
        {/* The four figures. */}
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:grid-cols-4">
          <Metric
            label={t("dashboard.income")}
            value={formatCurrency(summary.incomeCents)}
            detail={t("dashboard.entryCount", { count: entryCount })}
            tone="income"
          />
          <Metric
            label={t("dashboard.expenses")}
            value={formatCurrency(summary.expenseCents)}
            detail={
              summary.expenseRate === null
                ? t("dashboard.noIncomeYet")
                : t("dashboard.expenseRate", { percent: summary.expenseRate })
            }
            tone="expense"
          />
          <Metric
            label={t("dashboard.savings")}
            value={formatCurrency(summary.savingCents)}
            detail={
              summary.savingsRate === null
                ? t("dashboard.noIncomeYet")
                : t("dashboard.savingsRate", { percent: summary.savingsRate })
            }
          />
          <Metric
            label={t("dashboard.sources")}
            value={formatNumber(summary.sourceCount, locale)}
            detail={
              topSourceShare === null
                ? t("dashboard.sourceCount", { count: summary.sourceCount })
                : topSourceShare >= 100
                  ? t("dashboard.concentrationSingle")
                  : t("dashboard.concentrationDetail", {
                      percent: topSourceShare,
                    })
            }
          />
        </div>

        {/* Net sits below the four rather than beside them: it is derived from
            two of them, not a fifth independent measurement. */}
        <NetBanner netCents={summary.netCents} t={t} />

        <TrendChart buckets={trendBuckets} totals={trendTotals} />

        <BudgetPanel categories={budgets} overCount={overBudgetCount} />

        <div className="grid gap-6 lg:grid-cols-2">
          <Breakdown
            title={t("dashboard.expenseBreakdown")}
            slices={expenseSlices}
            empty={t("dashboard.expenseBreakdownEmpty")}
            tone="expense"
            action={{ href: "/entries", label: t("dashboard.viewLedger") }}
          />
          <Breakdown
            title={t("dashboard.incomeBreakdown")}
            slices={incomeSlices}
            empty={t("dashboard.incomeBreakdownEmpty")}
            tone="income"
            action={{ href: "/sources", label: t("nav.sources") }}
          />
        </div>

        <section className="rounded-lg border border-border bg-surface">
          <div className="border-b border-border px-5 py-3">
            <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
              {t("dashboard.recent")}
            </h2>
          </div>

          {recent.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-muted">
              {t("dashboard.recentEmpty")}
            </p>
          ) : (
            <ul>
              {recent.map((entry) => {
                const type = toEntryType(entry.type);

                return (
                  <li
                    key={entry.id}
                    className="flex items-center gap-4 border-b border-border px-5 py-3 last:border-b-0"
                  >
                    <span className={`shrink-0 ${ENTRY_TYPE_STYLES[type]}`}>
                      {entryTypeLabel(t, type)}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {type === "INCOME"
                          ? (entry.source?.name ?? t("common.empty"))
                          : type === "EXPENSE"
                            ? (entry.expenseCategory?.name ?? t("common.empty"))
                            : bucketLabel(t, entry.category)}
                      </div>
                      <div className="truncate text-[13px] text-muted">
                        {entry.note ?? formatIsoDate(toIsoDate(entry.occurredOn))}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 text-sm font-medium tabular-nums ${
                        type === "EXPENSE" ? "text-danger-text" : ""
                      }`}
                    >
                      {type === "EXPENSE" ? "−" : ""}
                      {formatCurrency(entry.amountCents)}
                    </span>

                    <time
                      dateTime={entry.createdAt.toISOString()}
                      className="hidden w-24 shrink-0 text-right text-[13px] text-muted sm:block"
                    >
                      {formatRelativeTime(entry.createdAt, now, locale)}
                    </time>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function NetBanner({ netCents, t }: { netCents: number; t: Translator }) {
  const detail =
    netCents > 0
      ? t("dashboard.netPositive")
      : netCents < 0
        ? t("dashboard.netNegative")
        : t("dashboard.netEven");

  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border border-border bg-surface px-5 py-4">
      <div className="flex items-baseline gap-3">
        <span className="text-xs font-medium tracking-wide text-muted uppercase">
          {t("dashboard.net")}
        </span>
        <span
          className={`text-2xl font-semibold tracking-tight tabular-nums ${
            netCents < 0 ? "text-danger-text" : ""
          }`}
        >
          {netCents < 0 ? "−" : ""}
          {formatCurrency(Math.abs(netCents))}
        </span>
      </div>
      <span className="text-[13px] text-muted">{detail}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  tone?: "income" | "expense";
}) {
  return (
    <div className="bg-surface px-5 py-4">
      <div className="text-xs font-medium tracking-wide text-muted uppercase">
        {label}
      </div>
      <div
        className={`mt-1.5 text-2xl font-semibold tracking-tight tabular-nums ${
          tone === "income"
            ? "text-(--badge-emerald-fg)"
            : tone === "expense"
              ? "text-[var(--badge-rose-fg)]"
              : ""
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[13px] text-muted">{detail}</div>
    </div>
  );
}
