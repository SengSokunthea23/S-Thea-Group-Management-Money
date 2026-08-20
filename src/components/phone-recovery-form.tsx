"use client";

import { useActionState, useState } from "react";
import {
  resetPassword,
  sendResetCode,
  verifyResetCode,
  type CheckCodeState,
  type ResetPasswordState,
  type SendCodeState,
} from "@/app/login/recovery-actions";
import { useT } from "@/components/i18n-provider";
import {
  Field,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import { CODE_LENGTH } from "@/lib/verification-constants";
import { MIN_PASSWORD_LENGTH } from "@/lib/profile";

type Step = "phone" | "code" | "password";

/**
 * Recovery by phone, as three steps in one component.
 *
 * Kept together because the steps share one thread of state — which number was
 * used, whether a code has been accepted — and splitting them across routes
 * would mean putting that thread in the URL, where it does not belong.
 *
 * Note what step 1 does *not* do: it never reports whether the number belongs
 * to an account. An unknown number advances to the code screen exactly like a
 * known one and simply never receives a working code. Anything else turns this
 * form into a way to test which phone numbers are registered here.
 */
export function PhoneRecoveryForm() {
  const t = useT();
  const [step, setStep] = useState<Step>("phone");
  const [masked, setMasked] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const [sendState, sendAction] = useActionState<SendCodeState, FormData>(
    async (prev, formData) => {
      const result = await sendResetCode(prev, formData);
      if (result?.ok) {
        setMasked(result.maskedPhone);
        setDevCode(result.devCode ?? null);
        setStep("code");
      }
      return result;
    },
    null,
  );

  const [checkState, checkAction] = useActionState<CheckCodeState, FormData>(
    async (prev, formData) => {
      const result = await verifyResetCode(prev, formData);
      if (result?.ok) setStep("password");
      return result;
    },
    null,
  );

  const [resetState, resetAction] = useActionState<ResetPasswordState, FormData>(
    resetPassword,
    null,
  );

  if (step === "phone") {
    return (
      <form action={sendAction} className="mt-6 space-y-4">
        <Field label={t("recovery.fieldPhone")} name="phone">
          <input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="012 345 678"
            className={inputClass()}
          />
          <p className="text-xs text-muted">{t("recovery.phoneHint")}</p>
        </Field>

        {sendState && !sendState.ok ? (
          <FormError>{sendState.error}</FormError>
        ) : null}

        <SubmitButton
          label={t("recovery.sendCode")}
          pendingLabel={t("recovery.sending")}
          className="w-full"
        />
      </form>
    );
  }

  if (step === "code") {
    return (
      <form action={checkAction} className="mt-6 space-y-4">
        <p className="text-sm text-muted">
          {t("recovery.codeSent", { phone: masked ?? "" })}
        </p>

        {/* Development only — the server refuses to return this in production.
            It exists so the flow can be walked through without a handset. */}
        {devCode ? (
          <p className="rounded-md border border-border bg-sunken px-3 py-2 text-sm">
            {t("recovery.devCode", { code: devCode })}
          </p>
        ) : null}

        <Field label={t("recovery.fieldCode")} name="code">
          <input
            id="code"
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={CODE_LENGTH}
            placeholder={"0".repeat(CODE_LENGTH)}
            className={`${inputClass()} text-center text-lg tracking-[0.4em] tabular-nums`}
          />
        </Field>

        {checkState && !checkState.ok ? (
          <FormError>{checkState.error}</FormError>
        ) : null}

        <SubmitButton
          label={t("recovery.verifyCode")}
          pendingLabel={t("recovery.verifying")}
          className="w-full"
        />

        <button
          type="button"
          onClick={() => setStep("phone")}
          className="w-full text-sm text-muted transition-colors hover:text-text"
        >
          {t("recovery.useAnotherNumber")}
        </button>
      </form>
    );
  }

  return (
    <form action={resetAction} className="mt-6 space-y-4">
      <p className="text-sm text-muted">{t("recovery.chooseNewPassword")}</p>

      <Field
        label={t("settings.fieldNewPassword")}
        name="newPassword"
        error={resetState?.fieldErrors.newPassword}
      >
        <input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass(resetState?.fieldErrors.newPassword)}
        />
        <p className="text-xs text-muted">
          {t("settings.passwordHint", { count: MIN_PASSWORD_LENGTH })}
        </p>
      </Field>

      <Field
        label={t("settings.fieldConfirmPassword")}
        name="confirmPassword"
        error={resetState?.fieldErrors.confirmPassword}
      >
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          className={inputClass(resetState?.fieldErrors.confirmPassword)}
        />
      </Field>

      {resetState?.formError ? (
        <FormError>{resetState.formError}</FormError>
      ) : null}

      <p className="text-xs text-muted">{t("recovery.signsOutOthers")}</p>

      <SubmitButton
        label={t("recovery.setPassword")}
        pendingLabel={t("common.saving")}
        className="w-full"
      />
    </form>
  );
}
