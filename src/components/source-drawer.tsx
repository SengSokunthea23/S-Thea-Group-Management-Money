"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  createSource,
  updateSource,
  type SourceActionState,
} from "@/app/(app)/sources/actions";
import { useT } from "@/components/i18n-provider";
import {
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import {
  SOURCE_KINDS,
  sourceKindLabel,
  toSourceKind,
  type SourceFieldErrors,
  type SourceRecord,
} from "@/lib/finance";

type SourceDrawerProps = {
  mode: "create" | "edit";
  source?: SourceRecord;
  onClose: () => void;
};

export function SourceDrawer({ mode, source, onClose }: SourceDrawerProps) {
  const t = useT();
  const action =
    mode === "edit" && source
      ? updateSource.bind(null, source.id)
      : createSource;

  const [state, formAction] = useActionState<SourceActionState, FormData>(
    action,
    null,
  );
  const firstFieldRef = useRef<HTMLInputElement>(null);

  const fieldErrors: SourceFieldErrors =
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
        aria-labelledby="source-drawer-title"
        className="animate-drawer-in relative flex h-full w-full max-w-md flex-col border-l border-border bg-surface shadow-xl"
      >
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-border px-6">
          <h2
            id="source-drawer-title"
            className="text-[15px] font-semibold tracking-tight"
          >
            {mode === "edit" ? t("sources.editTitle") : t("sources.new")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.closePanel")}
            className="-mr-2.5 rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-text"
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
              label={t("sources.fieldName")}
              name="name"
              error={fieldErrors.name}
            >
              <input
                ref={firstFieldRef}
                id="name"
                name="name"
                defaultValue={source?.name}
                placeholder={t("sources.namePlaceholder")}
                autoComplete="off"
                className={inputClass(fieldErrors.name)}
              />
            </Field>

            <Field
              label={t("sources.fieldKind")}
              name="kind"
              error={fieldErrors.kind}
            >
              <select
                id="kind"
                name="kind"
                defaultValue={source ? toSourceKind(source.kind) : "SALARY"}
                className={inputClass(fieldErrors.kind)}
              >
                {SOURCE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {sourceKindLabel(t, kind)}
                  </option>
                ))}
              </select>
            </Field>

            {/*
              A checkbox, so an unchecked box submits nothing and the parser
              reads its absence as false — no hidden companion field needed.
            */}
            <div className="space-y-1.5">
              <label
                htmlFor="active"
                className="flex items-center gap-2.5 text-sm font-medium"
              >
                <input
                  id="active"
                  name="active"
                  type="checkbox"
                  defaultChecked={source ? source.active : true}
                  className="size-4 accent-[var(--accent)]"
                />
                {t("sources.fieldActive")}
              </label>
              <p className="text-xs text-muted">{t("sources.activeHint")}</p>
            </div>

            <Field
              label={t("sources.fieldNote")}
              name="note"
              error={fieldErrors.note}
              optional
            >
              <textarea
                id="note"
                name="note"
                rows={2}
                defaultValue={source?.note ?? ""}
                placeholder={t("sources.notePlaceholder")}
                className={`${inputClass(fieldErrors.note)} resize-y`}
              />
            </Field>

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
                mode === "edit" ? t("common.saveChanges") : t("sources.create")
              }
              pendingLabel={t("common.saving")}
            />
          </div>
        </form>
      </div>
    </div>
  );
}
