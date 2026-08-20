"use client";

import { useCallback, useMemo, useState } from "react";
import { deleteEntry } from "@/app/(app)/entries/actions";
import { EntryDrawer } from "@/components/entry-drawer";
import { RowActions } from "@/components/row-actions";
import { useT } from "@/components/i18n-provider";
import { formatIsoDate } from "@/lib/date";
import { formatCurrency } from "@/lib/format";
import {
  ENTRY_TYPES,
  ENTRY_TYPE_STYLES,
  categoryLabel,
  entryTypeLabel,
  toEntryType,
  type EntryRecord,
  type EntryType,
  type SourceOption,
} from "@/lib/finance";

type DrawerState =
  | { mode: "create" }
  | { mode: "edit"; entry: EntryRecord }
  | null;

type Filter = EntryType | "ALL";

export function EntriesView({
  entries,
  sources,
}: {
  entries: EntryRecord[];
  sources: SourceOption[];
}) {
  const t = useT();
  const [drawer, setDrawer] = useState<DrawerState>(null);
  const [filter, setFilter] = useState<Filter>("ALL");

  const closeDrawer = useCallback(() => setDrawer(null), []);

  const visible = useMemo(
    () =>
      filter === "ALL"
        ? entries
        : entries.filter((entry) => toEntryType(entry.type) === filter),
    [entries, filter],
  );

  // Income needs somewhere to have come from, so the button is only disabled
  // when there are no sources *and* income is the only thing you could add.
  const canAddIncome = sources.length > 0;

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-surface px-8">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-[15px] font-semibold tracking-tight">
            {t("entries.title")}
          </h1>
          <span className="text-sm text-muted">
            {t("entries.count", { count: visible.length })}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setDrawer({ mode: "create" })}
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
        >
          {t("entries.new")}
        </button>
      </header>

      <div className="space-y-5 px-8 py-8">
        <div
          role="group"
          aria-label={t("entries.columnType")}
          className="flex w-fit gap-0.5 rounded-md bg-sunken p-0.5"
        >
          {(["ALL", ...ENTRY_TYPES] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={option === filter}
              className={`rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
                option === filter
                  ? "bg-surface text-text shadow-sm"
                  : "text-muted hover:text-text"
              }`}
            >
              {option === "ALL"
                ? t("entries.filterAll")
                : entryTypeLabel(t, option)}
            </button>
          ))}
        </div>

        {visible.length === 0 ? (
          <EmptyState
            filtered={filter !== "ALL"}
            canAddIncome={canAddIncome}
            onCreate={() => setDrawer({ mode: "create" })}
          />
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>{t("entries.columnDate")}</Th>
                  <Th>{t("entries.columnType")}</Th>
                  <Th>{t("entries.columnDetail")}</Th>
                  <Th className="hidden lg:table-cell">
                    {t("entries.columnNote")}
                  </Th>
                  <Th className="text-right">{t("entries.columnAmount")}</Th>
                  <Th className="text-right">
                    <span className="sr-only">{t("common.actions")}</span>
                  </Th>
                </tr>
              </thead>
              <tbody>
                {visible.map((entry) => {
                  const type = toEntryType(entry.type);

                  return (
                    <tr
                      key={entry.id}
                      className="border-b border-border last:border-b-0 transition-colors hover:bg-hover-soft"
                    >
                      <td className="px-5 py-3.5 text-muted tabular-nums">
                        {formatIsoDate(entry.occurredOn)}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={ENTRY_TYPE_STYLES[type]}>
                          {entryTypeLabel(t, type)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-medium">
                        {/* Income is identified by its source, everything else
                            by its category — the two never both apply. */}
                        {type === "INCOME"
                          ? (entry.sourceName ?? t("common.empty"))
                          : categoryLabel(t, type, entry.category)}
                      </td>
                      <td className="hidden max-w-xs px-5 py-3.5 text-muted lg:table-cell">
                        <span className="line-clamp-1">
                          {entry.note ?? t("common.empty")}
                        </span>
                      </td>
                      <td
                        className={`px-5 py-3.5 text-right font-medium tabular-nums ${
                          type === "EXPENSE" ? "text-danger-text" : ""
                        }`}
                      >
                        {type === "EXPENSE" ? "−" : ""}
                        {formatCurrency(entry.amountCents)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <RowActions
                          onEdit={() => setDrawer({ mode: "edit", entry })}
                          onDelete={() => deleteEntry(entry.id)}
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
        <EntryDrawer
          // Remount per target so the form and its action state reset cleanly.
          key={drawer.mode === "edit" ? drawer.entry.id : "create"}
          mode={drawer.mode}
          entry={drawer.mode === "edit" ? drawer.entry : undefined}
          sources={sources}
          // Adding while a filter is on almost always means "another one of
          // these", so the drawer opens on the type you were looking at.
          defaultType={filter === "ALL" ? undefined : filter}
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

function EmptyState({
  filtered,
  canAddIncome,
  onCreate,
}: {
  filtered: boolean;
  canAddIncome: boolean;
  onCreate: () => void;
}) {
  const t = useT();

  const body = filtered
    ? t("entries.emptyBodyFiltered")
    : canAddIncome
      ? t("entries.emptyBody")
      : t("entries.emptyBodyNoSources");

  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center">
      <h2 className="text-sm font-medium">{t("entries.emptyTitle")}</h2>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{body}</p>
      <button
        type="button"
        onClick={onCreate}
        className="mt-5 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        {t("entries.new")}
      </button>
    </div>
  );
}
