"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn, type LoginState } from "@/app/login/actions";
import Link from "next/link";
import { useT } from "@/components/i18n-provider";

const FIELD_CLASS =
  "w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none transition-shadow placeholder:text-placeholder focus:border-accent focus:ring-2 focus:ring-focus-ring";

export function LoginForm() {
  const t = useT();
  const [state, formAction] = useActionState<LoginState, FormData>(
    signIn,
    null,
  );

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-medium">
          {t("login.email")}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={FIELD_CLASS}
        />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <label htmlFor="password" className="text-sm font-medium">
            {t("login.password")}
          </label>
          <Link
            href="/login/forgot"
            className="text-[13px] text-accent hover:underline"
          >
            {t("login.forgotPassword")}
          </Link>
        </div>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={FIELD_CLASS}
        />
      </div>

      {state?.error ? (
        <p
          role="alert"
          className="rounded-md bg-danger-surface px-3 py-2 text-sm text-danger-text"
        >
          {state.error}
        </p>
      ) : null}

      <SubmitButton />

      {/* The second way in, offered next to the password rather than hidden
          behind the recovery page — it is a sign-in method in its own right. */}
      <p className="text-center text-sm text-muted">
        <Link href="/login/qr" className="text-accent hover:underline">
          {t("login.useQr")}
        </Link>
      </p>
    </form>
  );
}

function SubmitButton() {
  const t = useT();
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {pending ? t("login.submitting") : t("login.submit")}
    </button>
  );
}
