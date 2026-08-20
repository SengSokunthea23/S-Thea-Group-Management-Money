"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword, type PasswordState } from "@/app/(app)/settings/actions";
import { useT } from "@/components/i18n-provider";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import { MIN_PASSWORD_LENGTH, type PasswordFieldErrors } from "@/lib/profile";

export function PasswordForm() {
  const t = useT();
  const [state, formAction] = useActionState<PasswordState, FormData>(
    changePassword,
    null,
  );
  const formRef = useRef<HTMLFormElement>(null);

  const fieldErrors: PasswordFieldErrors =
    state && !state.ok ? state.fieldErrors : {};

  // Never leave the old password sitting in the DOM after a successful change.
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <Field
        label={t("settings.fieldCurrentPassword")}
        name="currentPassword"
        error={fieldErrors.currentPassword}
      >
        <input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          className={inputClass(fieldErrors.currentPassword)}
        />
      </Field>

      <Field
        label={t("settings.fieldNewPassword")}
        name="newPassword"
        error={fieldErrors.newPassword}
      >
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass(fieldErrors.newPassword)}
        />
        <p className="text-xs text-muted">
          {t("settings.passwordHint", { count: MIN_PASSWORD_LENGTH })}
        </p>
      </Field>

      <Field
        label={t("settings.fieldConfirmPassword")}
        name="confirmPassword"
        error={fieldErrors.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass(fieldErrors.confirmPassword)}
        />
      </Field>

      {state?.ok ? <FormSuccess>{state.message}</FormSuccess> : null}

      {state && !state.ok && state.formError ? (
        <FormError>{state.formError}</FormError>
      ) : null}

      <SubmitButton
        label={t("settings.changePassword")}
        pendingLabel={t("settings.changingPassword")}
      />
    </form>
  );
}
