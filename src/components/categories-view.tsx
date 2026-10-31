"use client";

import { useCallback, useState } from "react";
import { deleteCategory } from "@/app/(app)/settings/categories/actions";
import { CategoryDrawer } from "@/components/category-drawer";
import { RowActions } from "@/components/row-actions";
import { useT } from "@/components/i18n-provider";
import { FormError } from "@/components/form-field";
import { formatCurrency } from "@/lib/format";
import {
  BUDGET_STATUS_FILL,
  budgetProgress,
  toneClass,
  type CategoryRecord,
} from "@/lib/expense";

type DrawerState =
  | { mode: "create" }
  | { mode: "edit"; category: CategoryRecord }
  | null;

export function CategoriesView({
  categories,
}: {
  categories: CategoryRecord[];
}) {
  const t = useT();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  // Deleting a category with history is refused rather than cascaded, and the
  // row action has nowhere to show why — so the reason surfaces here.
  const [error, setError] = useState<string | null>(null);

  const closeDrawer = useCallback(() => setDrawer(null), []);

  const activeCount = categories.filter((category) => category.active).length;

  async function handleDelete(id: string) {
    setError(null);
    const result = await deleteCategory(id);
    if (result && !result.ok && result.formError) setError(result.formError);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-sm font-medium">{t("categories.title")}</h2>
          <span className="text-sm text-muted">
            {t("categories.count", { count: categories.length })} ·{" "}
            {t("categories.activeCount", { count: activeCount })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDrawer({ mode: "create" })}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          {t("categories.new")}
        </button>
      </div>

      <p className="text-[13px] text-muted">{t("categories.description")}</p>

      {error ? <FormError>{error}</FormError> : null}

      {categories.length === 0 ? (
        <EmptyState onCreate={() => setDrawer({ mode: "create" })} />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {categories.map((category) => {
            const progress = budgetProgress(
              category.spentCents,
              category.budgetCents,
            );

            return (
              <li
                key={category.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-5 py-4 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={toneClass(category.tone)}>
                      {category.name}
                    </span>
                    {category.active ? null : (
                      <span className="badge badge-neutral">
                        {t("categories.archived")}
                      </span>
                    )}
                    {/* How many entries are filed here — `categories.count`
                        would read "8 categories" on a single category's row. */}
                    <span className="text-[13px] text-muted">
                      {t("entries.count", { count: category.entryCount })}
                    </span>
                  </div>

                  {/* The budget meter only appears where there is a budget —
                      an empty bar would imply a limit of nothing. */}
                  {progress.status === "none" ? (
                    <span className="text-[13px] text-muted">
                      {t("categories.noBudget")} ·{" "}
                      {formatCurrency(category.spentCents)}
                    </span>
                  ) : (
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[13px]">
                        <span className="tabular-nums">
                          {formatCurrency(progress.spentCents)} /{" "}
                          {formatCurrency(progress.budgetCents ?? 0)}
                        </span>
                        <span
                          className={
                            progress.status === "over"
                              ? "text-danger-text"
                              : "text-muted"
                          }
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
                        </span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-track"
                        role="presentation"
                      >
                        <div
                          className={`h-full rounded-full ${BUDGET_STATUS_FILL[progress.status]}`}
                          // Capped at 100 so an overspend fills the bar rather
                          // than overflowing its container; the figure above
                          // carries the real number.
                          style={{ width: `${Math.min(progress.percent, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <RowActions
                  onEdit={() => setDrawer({ mode: "edit", category })}
                  onDelete={() => handleDelete(category.id)}
                />
              </li>
            );
          })}
        </ul>
      )}

      {drawer ? (
        <CategoryDrawer
          key={drawer.mode === "edit" ? drawer.category.id : "create"}
          mode={drawer.mode}
          category={drawer.mode === "edit" ? drawer.category : undefined}
          onClose={closeDrawer}
        />
      ) : null}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useT();

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <h3 className="text-sm font-medium">{t("categories.emptyTitle")}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {t("categories.emptyBody")}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        {t("categories.new")}
      </button>
    </div>
  );
}
