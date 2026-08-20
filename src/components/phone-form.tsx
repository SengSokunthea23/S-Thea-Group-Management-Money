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
 *
 * Which step is showing is *derived* from the two action results, not stored.
 * Two earlier attempts got this wrong in different ways, and both failures came
 * from the same instinct — keeping a copy of something the action results
 * already say:
 *
 *   - Adjusting a `useState` during render meant two conditions each undoing
 *     the other every pass, which React stops as an infinite loop.
 *   - Setting it from inside the action reducer looked safer, but `savePhone`
 *     calls `revalidatePath`, and the re-render that follows discarded the
 *     update — the code was sent and the form silently stayed put.
 *
 * Derivation has neither failure mode: there is no second copy to disagree.
 * The one genuine piece of local state is `dismissed`, which exists because
 * "I want to go back and edit the number" is a fact about the reader that no
 * action result can carry.
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

  const [saveState, saveAction] = useActionState<PhoneState, FormData>(
    savePhone,
    null,
  );
  const [confirmState, confirmAction] = useActionState<PhoneState, FormData>(
    confirmPhone,
    null,
  );

  // Set only by the Cancel button, cleared only by sending a new code. Both are
  // event handlers, so neither can loop.
  const [dismissed, setDismissed] = useState(false);

  const sent =
    saveState?.ok && saveState.step === "verify" ? saveState : null;
  const justVerified =
    confirmState?.ok && confirmState.step === "verified" ? confirmState : null;

  const awaiting = sent && !justVerified && !dismissed ? sent : null;

  if (awaiting) {
    return (
      <form action={confirmAction} className="space-y-4">
        <p className="text-sm text-muted">
          {t("recovery.codeSent", { phone: awaiting.maskedPhone })}
        </p>

        {/* Development only — the server refuses to return this in production. */}
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
            onClick={() => setDismissed(true)}
            className="rounded-md border border-border px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-hover-soft hover:text-text"
          >
            {t("common.cancel")}
          </button>
        </div>
      </form>
    );
  }

  return (
    <form
      action={saveAction}
      // A fresh send supersedes any earlier dismissal, so the code step shows
      // again rather than being suppressed by a decision about the last one.
      onSubmit={() => setDismissed(false)}
      className="space-y-4"
    >
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
            <span className="badge badge-amber">{t("phone.notVerified")}</span>
          )}
        </p>
      ) : null}

      {justVerified ? <FormSuccess>{justVerified.message}</FormSuccess> : null}
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
