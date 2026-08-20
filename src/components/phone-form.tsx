"use client";

import { useActionState, useState } from "react";
import {
  confirmPhone,
  savePhone,
  type PhoneState,
} from "@/app/(app)/settings/phone-actions";
import { useT } from "@/components/i18n-provider";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import { CODE_LENGTH } from "@/lib/verification-constants";

/**
 * The recovery phone, kept out of the main profile form.
 *
 * It saves on its own because it has a second step: a saved number is not yet a
 * usable one, and folding that round-trip into "Save profile" would mean the
 * button sometimes finishes and sometimes hands back a code box.
 */
export function PhoneForm({
  phone,
  verified,
}: {
  /** Current number, formatted for display, or null. */
  phone: string | null;
  verified: boolean;
}) {
  const t = useT();

  // Once a code has been sent this holds the masked number; clearing it drops
  // back to the number field.
  const [awaiting, setAwaiting] = useState<{
    masked: string;
    devCode?: string;
  } | null>(null);

  /*
    The step is moved by the actions themselves, not derived from their results
    during render.

    Deriving it looked tidier and was wrong: `savePhone` keeps reporting
    step: "verify" forever, so the moment a successful confirm cleared
    `awaiting`, the next render saw "verify" with nothing awaiting and set it
    straight back — which re-triggered the clear. Two conditions, each undoing
    the other, for as long as React would allow. Transitions belong at the point
    something actually happens.
  */
  const [saveState, saveAction] = useActionState<PhoneState, FormData>(
    async (prev, formData) => {
      const result = await savePhone(prev, formData);
      if (result?.ok && result.step === "verify") {
        setAwaiting({ masked: result.maskedPhone, devCode: result.devCode });
      }
      return result;
    },
    null,
  );

  const [confirmState, confirmAction] = useActionState<PhoneState, FormData>(
    async (prev, formData) => {
      const result = await confirmPhone(prev, formData);
      if (result?.ok && result.step === "verified") setAwaiting(null);
      return result;
    },
    null,
  );

  if (awaiting) {
    return (
      <form action={confirmAction} className="space-y-4">
        <p className="text-sm text-muted">
          {t("recovery.codeSent", { phone: awaiting.masked })}
        </p>

        {awaiting.devCode ? (
          <p className="rounded-md border border-border bg-sunken px-3 py-2 text-sm">
            {t("recovery.devCode", { code: awaiting.devCode })}
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

        {confirmState && !confirmState.ok ? (
          <FormError>{confirmState.error}</FormError>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <SubmitButton
            label={t("phone.confirm")}
            pendingLabel={t("recovery.verifying")}
          />
          <button
            type="button"
            onClick={() => setAwaiting(null)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-hover-soft hover:text-text"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form action={saveAction} className="space-y-4">
      <Field label={t("phone.field")} name="phone">
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          defaultValue={phone ?? ""}
          placeholder="012 345 678"
          className={inputClass()}
        />
        <p className="text-xs text-muted">{t("phone.hint")}</p>
      </Field>

      {phone ? (
        <p className="text-sm">
          {verified ? (
            <span className="badge badge-emerald">{t("phone.isVerified")}</span>
          ) : (
            <span className="badge badge-amber">
              {t("phone.notVerified")}
            </span>
          )}
        </p>
      ) : null}

      {confirmState?.ok && confirmState.step === "verified" ? (
        <FormSuccess>{confirmState.message}</FormSuccess>
      ) : null}
      {saveState?.ok && saveState.step === "cleared" ? (
        <FormSuccess>{saveState.message}</FormSuccess>
      ) : null}
      {saveState && !saveState.ok ? (
        <FormError>{saveState.error}</FormError>
      ) : null}

      <SubmitButton
        label={phone ? t("phone.update") : t("phone.add")}
        pendingLabel={t("recovery.sending")}
      />
    </form>
  );
}
