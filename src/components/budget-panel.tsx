import Link from "next/link";
import { formatCurrency } from "@/lib/format";
import {
  BUDGET_STATUS_FILL,
  budgetProgress,
  toneClass,
  type CategoryRecord,
} from "@/lib/expense";
import { getT } from "@/lib/preferences";

/**
 * Month-to-date spending against each category's budget.
 *
 * Always a *monthly* figure, regardless of the period selected above it — a
 * monthly limit measured over twelve months would compare a cap against twelve
 * times the spending and report catastrophe every time. The heading says so.
 *
 * Only categories with a budget appear: a meter with no limit has nothing to
 * measure, and a row of empty bars would suggest otherwise.
 */
export async function BudgetPanel({
  categories,
  overCount,
}: {
  categories: CategoryRecord[];
  overCount: number;
}) {
  const t = await getT();

  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border px-5 py-3">
        <h2 className="text-xs font-medium tracking-wide text-muted uppercase">
          {t("dashboard.budgets")}
        </h2>

        <div className="flex items-center gap-3">
          {overCount > 0 ? (
            <span className="badge badge-rose">
              {t("dashboard.overBudgetCount", { count: overCount })}
            </span>
          ) : null}
          <Link
            href="/settings/categories"
            className="shrink-0 text-sm font-medium text-accent hover:underline"
          >
            {t("dashboard.budgetsAction")}
          </Link>
        </div>
      </div>

      {categories.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-muted">
          {t("dashboard.budgetsEmpty")}
        </p>
      ) : (
        <ul className="grid gap-4 px-5 py-4 sm:grid-cols-2">
          {categories.map((category) => {
            const progress = budgetProgress(
              category.spentCents,
              category.budgetCents,
            );

            return (
              <li key={category.id} className="space-y-1.5">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <span className={toneClass(category.tone)}>
                    {category.name}
                  </span>
                  <span className="text-[13px] tabular-nums">
                    {formatCurrency(progress.spentCents)}
                    <span className="text-muted">
                      {" / "}
                      {formatCurrency(progress.budgetCents ?? 0)}
                    </span>
                  </span>
                </div>

                <div
                  className="h-1.5 overflow-hidden rounded-full bg-track"
                  role="presentation"
                >
                  <div
                    className={`h-full rounded-full ${BUDGET_STATUS_FILL[progress.status]}`}
                    // Capped at 100 so an overspend fills the bar instead of
                    // overflowing it; the figures carry the real number.
                    style={{ width: `${Math.min(progress.percent, 100)}%` }}
                  />
                </div>

                <p
                  className={`text-[13px] ${
                    progress.status === "over" ? "text-danger-text" : "text-muted"
                  }`}
                >
                  {progress.status === "over"
                    ? t("categories.overBy", {
                        amount: formatCurrency(
                          Math.abs(progress.remainingCents),
                        ),
                      })
                    : t("categories.remaining", {
                        amount: formatCurrency(progress.remainingCents),
                      })}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
