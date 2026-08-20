"use client";

import { useFormStatus } from "react-dom";
import { useT } from "@/components/i18n-provider";

/**
 * Shared form furniture. The contact drawer, the deal drawer and the two
 * settings forms each carried their own copy of `Field` and `inputClass`; they
 * differed only by accident, and every one of them needed the same two changes
 * — themed colours and a translated "Optional" — so they are one module now.
 */

export function inputClass(error?: string): string {
  return `w-full rounded-md border bg-surface px-3 py-2 text-sm text-text outline-none transition-shadow placeholder:text-placeholder focus:ring-2 ${
    error
      ? "border-danger-border focus:border-danger focus:ring-danger-ring"
      : "border-border focus:border-accent focus:ring-focus-ring"
  }`;
}

export function Field({
  label,
  name,
  error,
  optional,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  const t = useT();

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={name}
        className="flex items-center gap-1.5 text-sm font-medium"
      >
        {label}
        {optional ? (
          <span className="text-xs font-normal text-muted">
            {t("common.optional")}
          </span>
        ) : null}
      </label>
      {children}
      {error ? <p className="text-sm text-danger-text">{error}</p> : null}
    </div>
  );
}

/** Form-level failure — the field-level ones render inside `Field`. */
export function FormError({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger-text"
    >
      {children}
    </p>
  );
}

export function FormSuccess({ children }: { children: React.ReactNode }) {
  return (
    <p
      role="status"
      className="rounded-md bg-success-surface px-3 py-2 text-sm text-success-text"
    >
      {children}
    </p>
  );
}

export function SubmitButton({
  label,
  pendingLabel,
  className = "",
}: {
  label: string;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60 ${className}`}
    >
      {pending ? pendingLabel : label}
    </button>
  );
}
