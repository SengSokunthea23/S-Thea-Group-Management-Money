"use client";

import { useCallback, useMemo, useState } from "react";
import { deleteEntry } from "@/app/(app)/entries/actions";
import { EntryDrawer } from "@/components/entry-drawer";
import { RowActions } from "@/components/row-actions";
import { useT } from "@/components/i18n-provider";
import { PageHeader } from "@/components/page-header";
import { FormSuccess } from "@/components/form-field";
import { formatIsoDate } from "@/lib/date";
import { formatCurrency } from "@/lib/format";
import {
  ENTRY_TYPES,
  ENTRY_TYPE_STYLES,
  bucketLabel,
  entryTypeLabel,
  toEntryType,
  type EntryRecord,
  type EntryType,
  type SourceOption,
} from "@/lib/finance";
import { paymentMethodLabel, toneClass, type CategoryOption } from "@/lib/expense";

type DrawerState =
  | { mode: "create" }
  | { mode: "edit"; entry: EntryRecord }
  | null;

type Filter = EntryType | "ALL";

export function EntriesView({
  entries,
  sources,
  categories,
  postedCount,
}: {
  entries: EntryRecord[];
  sources: SourceOption[];
  categories: CategoryOption[];
  /** Recurring expenses written by the catch-up on this page load. */
  postedCount: number;
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
      <PageHeader>
        <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-8">
          {/* min-w-0 lets the title truncate instead of shoving the button off
              the edge on a narrow screen. */}
          <div className="flex min-w-0 items-baseline gap-2.5">
            <h1 className="truncate text-[15px] font-semibold tracking-tight">
              {t("entries.title")}
            </h1>
            <span className="hidden shrink-0 text-sm text-muted sm:inline">
              {t("entries.count", { count: visible.length })}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setDrawer({ mode: "create" })}
            className="shrink-0 whitespace-nowrap rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
          >
            {t("entries.new")}
          </button>
        </div>
      </PageHeader>

      <div className="space-y-5 px-4 py-6 sm:px-8 sm:py-8">
        {/* Says what the app did on your behalf while you were away, rather
            than letting entries appear unannounced. */}
        {postedCount > 0 ? (
          <FormSuccess>
            {t("recurring.posted", { count: postedCount })}
          </FormSuccess>
        ) : null}

        {/* Four filters, and the Khmer labels are wide — the strip scrolls
            inside itself rather than pushing the page sideways. */}
        <div
          role="group"
          aria-label={t("entries.columnType")}
          className="scroll-strip -mx-1 flex max-w-full gap-0.5 overflow-x-auto overflow-y-hidden px-1"
        >
          {(["ALL", ...ENTRY_TYPES] as Filter[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              aria-pressed={option === filter}
              className={`shrink-0 whitespace-nowrap rounded-[5px] px-3 py-1.5 text-sm font-medium transition-colors ${
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
          /* A ledger row carries a date, a type, a category, an amount and two
             controls; below about 640px that cannot be squeezed without making
             every column unreadable. The table scrolls inside its own box so
             the page body never scrolls sideways. */
          <div className="overflow-x-auto rounded-lg border border-border bg-surface">
            <table className="w-full min-w-[38rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <Th>{t("entries.columnDate")}</Th>
                  <Th>{t("entries.columnType")}</Th>
                  <Th>{t("entries.columnDetail")}</Th>
                  <Th className="hidden xl:table-cell">
                    {t("entries.columnMerchant")}
                  </Th>
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
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Each flow is identified differently: income by its
                              source, an expense by its category badge, savings
                              by its bucket. Never more than one applies. */}
                          {type === "INCOME" ? (
                            <span className="font-medium">
                              {entry.sourceName ?? t("common.empty")}
                            </span>
                          ) : type === "EXPENSE" ? (
                            <span className={toneClass(entry.categoryTone ?? "neutral")}>
                              {entry.categoryName ?? t("common.empty")}
                            </span>
                          ) : (
                            <span className="font-medium">
                              {bucketLabel(t, entry.category)}
                            </span>
                          )}

                          {entry.attachments.length > 0 ? (
                            <span
                              title={t("entries.fieldReceipts")}
                              className="inline-flex items-center gap-1 text-xs text-muted"
                            >
                              <PaperclipIcon />
                              {entry.attachments.length}
                            </span>
                          ) : null}

                          {entry.recurringId ? (
                            <span className="badge badge-neutral">
                              {t("entries.fromRecurring")}
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="hidden max-w-[12rem] px-5 py-3.5 text-muted xl:table-cell">
                        <span className="line-clamp-1">
                          {entry.merchant ?? t("common.empty")}
                        </span>
                        {entry.paymentMethod ? (
                          <span className="block text-[12px]">
                            {paymentMethodLabel(t, entry.paymentMethod)}
                          </span>
                        ) : null}
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
          categories={categories}
          // Adding while a filter is on almost always means "another one of
          // these", so the drawer opens on the type you were looking at.
          defaultType={filter === "ALL" ? undefined : filter}
          onClose={closeDrawer}
        />
      ) : null}
    </>
  );
}

function PaperclipIcon() {
  return (
    <svg
      className="size-3.5"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.5 9.5 9.2 14.8a3.25 3.25 0 0 1-4.6-4.6l6-6a2.25 2.25 0 0 1 3.18 3.18l-6 6a1.25 1.25 0 0 1-1.77-1.77l5.3-5.3" />
    </svg>
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
