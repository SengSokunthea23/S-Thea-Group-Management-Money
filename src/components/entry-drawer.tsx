"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  createEntry,
  updateEntry,
  type EntryActionState,
} from "@/app/(app)/entries/actions";
import { useT } from "@/components/i18n-provider";
import { AttachmentField } from "@/components/attachment-field";
import {
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import { DATE_PLACEHOLDER, formatIsoDate } from "@/lib/date";
import {
  ENTRY_TYPES,
  bucketLabel,
  categoriesFor,
  entryTypeLabel,
  toEntryType,
  type EntryFieldErrors,
  type EntryRecord,
  type EntryType,
  type SourceOption,
} from "@/lib/finance";
import {
  PAYMENT_METHODS,
  paymentMethodLabel,
  type CategoryOption,
} from "@/lib/expense";

type EntryDrawerProps = {
  mode: "create" | "edit";
  entry?: EntryRecord;
  sources: SourceOption[];
  categories: CategoryOption[];
  /** Preselected when the ledger is filtered — the type you were looking at. */
  defaultType?: EntryType;
  onClose: () => void;
};

export function EntryDrawer({
  mode,
  entry,
  sources,
  categories,
  defaultType,
  onClose,
}: EntryDrawerProps) {
  const t = useT();
  const action =
    mode === "edit" && entry ? updateEntry.bind(null, entry.id) : createEntry;

  const [state, formAction] = useActionState<EntryActionState, FormData>(
    action,
    null,
  );
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // The type drives which classification fields are shown, so it is the one
  // input this drawer tracks in state rather than leaving uncontrolled.
  const [type, setType] = useState<EntryType>(
    entry ? toEntryType(entry.type) : (defaultType ?? "EXPENSE"),
  );

  const fieldErrors: EntryFieldErrors =
    state && !state.ok ? state.fieldErrors : {};

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  useEffect(() => {
    firstFieldRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const buckets = categoriesFor(type);
  const editingSameType = entry ? toEntryType(entry.type) === type : false;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label={t("common.close")}
        onClick={onClose}
        className="animate-backdrop-in absolute inset-0 cursor-default bg-backdrop"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-drawer-title"
        className="animate-drawer-in relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <h2
            id="entry-drawer-title"
            className="text-[15px] font-semibold tracking-tight"
          >
            {mode === "edit" ? t("entries.editTitle") : t("entries.new")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.closePanel")}
            className="-mr-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-text"
          >
            <svg
              className="size-4"
              viewBox="0 0 20 20"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="m5.5 5.5 9 9m0-9-9 9" />
            </svg>
          </button>
        </div>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            {/*
              Three radio buttons styled as a segmented control rather than a
              <select>: the choice reshapes the rest of the form, so it should
              be visible at a glance instead of hidden behind a click.
            */}
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">
                {t("entries.fieldType")}
              </legend>
              <div className="flex gap-1 rounded-md bg-sunken p-1">
                {ENTRY_TYPES.map((option) => (
                  <label
                    key={option}
                    className={`flex flex-1 cursor-pointer items-center justify-center rounded-[5px] px-2 py-1.5 text-sm font-medium transition-colors ${
                      option === type
                        ? "bg-surface text-text shadow-sm"
                        : "text-muted hover:text-text"
                    }`}
                  >
                    <input
                      type="radio"
                      name="type"
                      value={option}
                      checked={option === type}
                      onChange={() => setType(option)}
                      className="sr-only"
                    />
                    {entryTypeLabel(t, option)}
                  </label>
                ))}
              </div>
              {fieldErrors.type ? (
                <p className="text-sm text-danger-text">{fieldErrors.type}</p>
              ) : null}
            </fieldset>

            <Field
              label={t("entries.fieldAmount")}
              name="amount"
              error={fieldErrors.amount}
            >
              <input
                ref={firstFieldRef}
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={entry ? (entry.amountCents / 100).toString() : ""}
                placeholder="1200"
                autoComplete="off"
                className={inputClass(fieldErrors.amount)}
              />
            </Field>

            <Field
              label={t("entries.fieldDate")}
              name="occurredOn"
              error={fieldErrors.occurredOn}
            >
              {/*
                A plain text field, not <input type="date">: the native control
                renders in the browser's own locale, which would show mm/dd/yyyy
                on most machines regardless of what the rest of the app does.
              */}
              <input
                id="occurredOn"
                name="occurredOn"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={DATE_PLACEHOLDER}
                defaultValue={
                  entry ? formatIsoDate(entry.occurredOn) : todayDayFirst()
                }
                className={inputClass(fieldErrors.occurredOn)}
              />
              <p className="text-xs text-muted">{t("entries.dateHint")}</p>
            </Field>

            {type === "INCOME" ? (
              <Field
                label={t("entries.fieldSource")}
                name="sourceId"
                error={fieldErrors.sourceId}
              >
                <select
                  id="sourceId"
                  name="sourceId"
                  defaultValue={entry?.sourceId ?? ""}
                  className={inputClass(fieldErrors.sourceId)}
                >
                  <option value="" disabled>
                    {t("entries.selectSource")}
                  </option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            {type === "EXPENSE" ? (
              <>
                <Field
                  label={t("entries.fieldCategory")}
                  name="categoryId"
                  error={fieldErrors.categoryId}
                >
                  <select
                    id="categoryId"
                    name="categoryId"
                    defaultValue={
                      editingSameType ? (entry?.categoryId ?? "") : ""
                    }
                    className={inputClass(fieldErrors.categoryId)}
                  >
                    <option value="" disabled>
                      {t("entries.selectCategory")}
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label={t("entries.fieldMerchant")}
                  name="merchant"
                  error={fieldErrors.merchant}
                  optional
                >
                  <input
                    id="merchant"
                    name="merchant"
                    defaultValue={entry?.merchant ?? ""}
                    placeholder={t("entries.merchantPlaceholder")}
                    autoComplete="off"
                    className={inputClass(fieldErrors.merchant)}
                  />
                </Field>

                <Field
                  label={t("entries.fieldPaymentMethod")}
                  name="paymentMethod"
                  error={fieldErrors.paymentMethod}
                  optional
                >
                  <select
                    id="paymentMethod"
                    name="paymentMethod"
                    defaultValue={entry?.paymentMethod ?? ""}
                    className={inputClass(fieldErrors.paymentMethod)}
                  >
                    <option value="">{t("entries.noPaymentMethod")}</option>
                    {PAYMENT_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {paymentMethodLabel(t, method)}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}

            {type === "SAVING" ? (
              <Field
                label={t("entries.fieldBucket")}
                name="category"
                error={fieldErrors.category}
              >
                <select
                  id="category"
                  name="category"
                  defaultValue={editingSameType ? (entry?.category ?? "") : ""}
                  className={inputClass(fieldErrors.category)}
                >
                  <option value="" disabled>
                    {t("entries.selectCategory")}
                  </option>
                  {buckets.map((bucket) => (
                    <option key={bucket} value={bucket}>
                      {bucketLabel(t, bucket)}
                    </option>
                  ))}
                </select>
              </Field>
            ) : null}

            <Field
              label={t("entries.fieldNote")}
              name="note"
              error={fieldErrors.note}
              optional
            >
              <textarea
                id="note"
                name="note"
                rows={2}
                defaultValue={entry?.note ?? ""}
                placeholder={t("entries.notePlaceholder")}
                className={`${inputClass(fieldErrors.note)} resize-y`}
              />
            </Field>

            {/* Receipts belong to spending. Income and savings are movements
                between your own accounts; there is no slip to keep. */}
            {type === "EXPENSE" ? (
              <>
                <AttachmentField
                  existing={editingSameType ? (entry?.attachments ?? []) : []}
                  fieldName="attachments"
                  removeFieldName="removeAttachments"
                />
                {fieldErrors.attachments ? (
                  <p className="text-sm text-danger-text">
                    {fieldErrors.attachments}
                  </p>
                ) : null}
              </>
            ) : null}

            {state && !state.ok && state.formError ? (
              <FormError>{state.formError}</FormError>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-hover-soft hover:text-text"
            >
              {t("common.cancel")}
            </button>
            <SubmitButton
              label={
                mode === "edit" ? t("common.saveChanges") : t("entries.create")
              }
              pendingLabel={t("common.saving")}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

/**
 * Today as dd/mm/yyyy, so recording something that just happened takes no
 * typing. Read from the browser clock and only ever used as a default value on
 * a freshly mounted drawer, so it never participates in hydration.
 */
function todayDayFirst(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${now.getFullYear()}`;
}
