"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createCategory,
  updateCategory,
  type CategoryActionState,
} from "@/app/(app)/settings/categories/actions";
import { useT } from "@/components/i18n-provider";
import {
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import {
  CATEGORY_TONES,
  toCategoryTone,
  toneClass,
  type CategoryRecord,
} from "@/lib/expense";
import type { CategoryFieldErrors } from "@/lib/finance";

export function CategoryDrawer({
  mode,
  category,
  onClose,
}: {
  mode: "create" | "edit";
  category?: CategoryRecord;
  onClose: () => void;
}) {
  const t = useT();
  const action =
    mode === "edit" && category
      ? updateCategory.bind(null, category.id)
      : createCategory;

  const [state, formAction] = useActionState<CategoryActionState, FormData>(
    action,
    null,
  );
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const fieldErrors: CategoryFieldErrors =
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
        aria-labelledby="category-drawer-title"
        className="animate-drawer-in relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <h2
            id="category-drawer-title"
            className="text-[15px] font-semibold tracking-tight"
          >
            {mode === "edit" ? t("categories.editTitle") : t("categories.new")}
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
              label={t("categories.fieldName")}
              name="name"
              error={fieldErrors.name}
            >
              <input
                ref={firstFieldRef}
                id="name"
                name="name"
                defaultValue={category?.name}
                placeholder={t("categories.namePlaceholder")}
                autoComplete="off"
                className={inputClass(fieldErrors.name)}
              />
            </Field>

            <Field
              label={t("categories.fieldBudget")}
              name="budget"
              error={fieldErrors.budget}
              optional
            >
              <input
                id="budget"
                name="budget"
                inputMode="decimal"
                defaultValue={
                  category?.budgetCents != null
                    ? (category.budgetCents / 100).toString()
                    : ""
                }
                placeholder="400"
                autoComplete="off"
                className={inputClass(fieldErrors.budget)}
              />
              <p className="text-xs text-muted">{t("categories.budgetHint")}</p>
            </Field>

            {/*
              Radios rather than a <select>: the point of a colour is that you
              recognise it at a glance in the ledger, which a list of colour
              *names* behind a click does not help with.
            */}
            <fieldset className="space-y-1.5">
              <legend className="text-sm font-medium">
                {t("categories.fieldTone")}
              </legend>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_TONES.map((tone) => (
                  <label key={tone} className="cursor-pointer">
                    <input
                      type="radio"
                      name="tone"
                      value={tone}
                      defaultChecked={
                        toCategoryTone(category?.tone ?? "neutral") === tone
                      }
                      className="peer sr-only"
                    />
                    <span
                      className={`${toneClass(tone)} px-3 py-1 ring-offset-2 ring-offset-[var(--surface)] peer-checked:ring-2 peer-checked:ring-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent`}
                    >
                      {t(`categories.tone.${tone}`)}
                    </span>
                  </label>
                ))}
              </div>
              {fieldErrors.tone ? (
                <p className="text-sm text-danger-text">{fieldErrors.tone}</p>
              ) : null}
            </fieldset>

            <div className="space-y-1.5">
              <label
                htmlFor="active"
                className="flex items-center gap-2.5 text-sm font-medium"
              >
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  defaultChecked={category ? category.active : true}
                  className="size-4 accent-[var(--accent)]"
                />
                {t("categories.fieldActive")}
              </label>
              <p className="text-xs text-muted">{t("categories.activeHint")}</p>
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
                  : t("categories.create")
              }
              pendingLabel={t("common.saving")}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
