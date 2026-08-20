"use client";

import { useCallback, useState } from "react";
import { deleteRecurring } from "@/app/(app)/settings/recurring/actions";
import { RecurringDrawer } from "@/components/recurring-drawer";
import { RowActions } from "@/components/row-actions";
import { useT } from "@/components/i18n-provider";
import { FormError } from "@/components/form-field";
import { formatCurrency } from "@/lib/format";
import {
  paymentMethodLabel,
  toneClass,
  type CategoryOption,
  type RecurringRecord,
} from "@/lib/expense";

type DrawerState =
  | { mode: "create" }
  | { mode: "edit"; template: RecurringRecord }
  | null;

export function RecurringView({
  templates,
  categories,
}: {
  templates: RecurringRecord[];
  categories: CategoryOption[];
}) {
  const t = useT();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [error, setError] = useState<string | null>(null);

  const closeDrawer = useCallback(() => setDrawer(null), []);

  async function handleDelete(id: string) {
    setError(null);
    const result = await deleteRecurring(id);
    if (result && !result.ok && result.formError) setError(result.formError);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-sm font-medium">{t("recurring.title")}</h2>
          <span className="text-sm text-muted">
            {t("recurring.count", { count: templates.length })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDrawer({ mode: "create" })}
          disabled={categories.length === 0}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-50"
        >
          {t("recurring.new")}
        </button>
      </div>

      <p className="text-[13px] text-muted">{t("recurring.description")}</p>

      {error ? <FormError>{error}</FormError> : null}

      {templates.length === 0 ? (
        <EmptyState onCreate={() => setDrawer({ mode: "create" })} />
      ) : (
        <ul className="overflow-hidden rounded-lg border border-border bg-surface">
          {templates.map((template) => (
            <li
              key={template.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-4 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={toneClass(template.categoryTone ?? "neutral")}>
                    {template.categoryName ?? t("common.empty")}
                  </span>
                  {template.merchant ? (
                    <span className="truncate font-medium">
                      {template.merchant}
                    </span>
                  ) : null}
                  {template.active ? null : (
                    <span className="badge badge-amber">
                      {t("recurring.paused")}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 text-[13px] text-muted">
                  {t("recurring.onDay", { day: template.dayOfMonth })}
                  {template.paymentMethod
                    ? ` · ${paymentMethodLabel(t, template.paymentMethod)}`
                    : ""}
                  {" · "}
                  {t("recurring.columnLast")}:{" "}
                  {template.lastPostedMonth ?? t("recurring.never")}
                </div>
              </div>

              <span className="shrink-0 font-medium tabular-nums">
                {formatCurrency(template.amountCents)}
              </span>

              <RowActions
                onEdit={() => setDrawer({ mode: "edit", template })}
                onDelete={() => handleDelete(template.id)}
              />
            </li>
          ))}
        </ul>
      )}

      {drawer ? (
        <RecurringDrawer
          key={drawer.mode === "edit" ? drawer.template.id : "create"}
          mode={drawer.mode}
          template={drawer.mode === "edit" ? drawer.template : undefined}
          categories={categories}
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
      <h3 className="text-sm font-medium">{t("recurring.emptyTitle")}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {t("recurring.emptyBody")}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        {t("recurring.new")}
      </button>
    </div>
  );
}
