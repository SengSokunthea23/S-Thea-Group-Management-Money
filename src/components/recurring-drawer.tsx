"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createRecurring,
  updateRecurring,
  type RecurringActionState,
} from "@/app/(app)/settings/recurring/actions";
import { useT } from "@/components/i18n-provider";
import {
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import { DATE_PLACEHOLDER, formatIsoDate } from "@/lib/date";
import {
  PAYMENT_METHODS,
  paymentMethodLabel,
  type CategoryOption,
  type RecurringRecord,
} from "@/lib/expense";
import type { RecurringFieldErrors } from "@/lib/finance";

export function RecurringDrawer({
  mode,
  template,
  categories,
  onClose,
}: {
  mode: "create" | "edit";
  template?: RecurringRecord;
  categories: CategoryOption[];
  onClose: () => void;
}) {
  const t = useT();
  const action =
    mode === "edit" && template
      ? updateRecurring.bind(null, template.id)
      : createRecurring;

  const [state, formAction] = useActionState<RecurringActionState, FormData>(
    action,
    null,
  );
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const fieldErrors: RecurringFieldErrors =
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
        aria-labelledby="recurring-drawer-title"
        className="animate-drawer-in relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <h2
            id="recurring-drawer-title"
            className="text-[15px] font-semibold tracking-tight"
          >
            {mode === "edit" ? t("recurring.editTitle") : t("recurring.new")}
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
            <Field
              label={t("recurring.fieldAmount")}
              name="amount"
              error={fieldErrors.amount}
            >
              <input
                ref={firstFieldRef}
                id="amount"
                name="amount"
                inputMode="decimal"
                defaultValue={
                  template ? (template.amountCents / 100).toString() : ""
                }
                placeholder="900"
                autoComplete="off"
                className={inputClass(fieldErrors.amount)}
              />
            </Field>

            <Field
              label={t("recurring.fieldCategory")}
              name="categoryId"
              error={fieldErrors.categoryId}
            >
              <select
                id="categoryId"
                name="categoryId"
                defaultValue={template?.categoryId ?? ""}
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
              label={t("recurring.fieldDay")}
              name="dayOfMonth"
              error={fieldErrors.dayOfMonth}
            >
              <input
                id="dayOfMonth"
                name="dayOfMonth"
                type="number"
                min={1}
                max={31}
                defaultValue={template?.dayOfMonth ?? 1}
                className={inputClass(fieldErrors.dayOfMonth)}
              />
              <p className="text-xs text-muted">{t("recurring.dayHint")}</p>
            </Field>

            <Field
              label={t("recurring.fieldStartsOn")}
              name="startsOn"
              error={fieldErrors.startsOn}
            >
              <input
                id="startsOn"
                name="startsOn"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder={DATE_PLACEHOLDER}
                defaultValue={
                  template ? formatIsoDate(template.startsOn) : todayDayFirst()
                }
                className={inputClass(fieldErrors.startsOn)}
              />
              <p className="text-xs text-muted">
                {t("recurring.startsOnHint")}
              </p>
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
                defaultValue={template?.merchant ?? ""}
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
                defaultValue={template?.paymentMethod ?? ""}
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
                defaultValue={template?.note ?? ""}
                placeholder={t("entries.notePlaceholder")}
                className={`${inputClass(fieldErrors.note)} resize-y`}
              />
            </Field>

            <div className="space-y-1.5">
              <label
                htmlFor="active"
                className="flex items-center gap-2.5 text-sm font-medium"
              >
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  defaultChecked={template ? template.active : true}
                  className="size-4 accent-[var(--accent)]"
                />
                {t("recurring.fieldActive")}
              </label>
              <p className="text-xs text-muted">{t("recurring.activeHint")}</p>
            </div>

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
                mode === "edit"
                  ? t("common.saveChanges")
                  : t("recurring.create")
              }
              pendingLabel={t("common.saving")}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

function todayDayFirst(): string {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${now.getFullYear()}`;
}
