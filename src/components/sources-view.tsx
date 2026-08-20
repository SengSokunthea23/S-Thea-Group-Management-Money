"use client";

import { useCallback, useState } from "react";
import { deleteSource } from "@/app/(app)/sources/actions";
import { SourceDrawer } from "@/components/source-drawer";
import { RowActions } from "@/components/row-actions";
import { useT } from "@/components/i18n-provider";
import { FormError } from "@/components/form-field";
import { formatCurrency } from "@/lib/format";
import {
  SOURCE_KIND_STYLES,
  sourceKindLabel,
  toSourceKind,
  type SourceRecord,
} from "@/lib/finance";

type DrawerState =
  | { mode: "create" }
  | { mode: "edit"; source: SourceRecord }
  | null;

export function SourcesView({ sources }: { sources: SourceRecord[] }) {
  const t = useT();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  // Deleting a source with history is refused rather than cascaded, and the
  // row action has nowhere to show why — so the reason surfaces here.
  const [error, setError] = useState<string | null>(null);

  const closeDrawer = useCallback(() => setDrawer(null), []);

  const activeCount = sources.filter((source) => source.active).length;

  async function handleDelete(id: string) {
    setError(null);
    const result = await deleteSource(id);
    if (result && !result.ok && result.formError) setError(result.formError);
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-8">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[15px] font-semibold tracking-tight">
            {t("sources.title")}
          </h1>
          <span className="text-sm text-muted">
            {t("sources.count", { count: sources.length })} ·{" "}
            {t("sources.activeCount", { count: activeCount })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDrawer({ mode: "create" })}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          {t("sources.new")}
        </button>
      </header>

      <div className="space-y-5 px-8 py-8">
        {error ? <FormError>{error}</FormError> : null}

        {sources.length === 0 ? (
          <EmptyState onCreate={() => setDrawer({ mode: "create" })} />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>{t("sources.columnSource")}</Th>
                  <Th>{t("sources.columnKind")}</Th>
                  <Th className="hidden md:table-cell text-right">
                    {t("sources.columnEntries")}
                  </Th>
                  <Th className="text-right">{t("sources.columnTotal")}</Th>
                  <Th className="text-right">
                    <span className="sr-only">{t("common.actions")}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {sources.map((source) => {
                  const kind = toSourceKind(source.kind);

                  return (
                    <tr
                      key={source.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-hover-soft"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-medium ${
                              source.active ? "" : "text-muted"
                            }`}
                          >
                            {source.name}
                          </span>
                          {source.active ? null : (
                            <span className="badge badge-neutral">
                              {t("sources.archived")}
                            </span>
                          )}
                        </div>
                        {source.note ? (
                          <div className="line-clamp-1 text-[13px] text-muted">
                            {source.note}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={SOURCE_KIND_STYLES[kind]}>
                          {sourceKindLabel(t, kind)}
                        </span>
                      </td>
                      <td className="hidden px-5 py-3.5 text-right text-muted tabular-nums md:table-cell">
                        {source.entryCount}
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium tabular-nums">
                        {formatCurrency(source.totalCents)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <RowActions
                          onEdit={() => setDrawer({ mode: "edit", source })}
                          onDelete={() => handleDelete(source.id)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {drawer ? (
        <SourceDrawer
          key={drawer.mode === "edit" ? drawer.source.id : "create"}
          mode={drawer.mode}
          source={drawer.mode === "edit" ? drawer.source : undefined}
          onClose={closeDrawer}
        />
      ) : null}
    </>
  );
}

function Th({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={`px-5 py-2.5 text-xs font-medium tracking-wide text-muted uppercase ${className}`}
    >
      {children}
    </th>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  const t = useT();

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <h2 className="text-sm font-medium">{t("sources.emptyTitle")}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">
        {t("sources.emptyBody")}
      </p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        {t("sources.new")}
      </button>
    </div>
  );
}
