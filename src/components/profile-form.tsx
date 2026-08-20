"use client";

import { useActionState } from "react";
import { updateProfile, type ProfileState } from "@/app/(app)/settings/actions";
import { useT } from "@/components/i18n-provider";
import { AvatarField } from "@/components/avatar-field";
import {
  Field,
  FormError,
  FormSuccess,
  SubmitButton,
  inputClass,
} from "@/components/form-field";
import {
  LANGUAGES,
  LANGUAGE_LABELS,
  toLanguage,
  type ProfileFieldErrors,
} from "@/lib/profile";

export type ProfileValues = {
  name: string;
  email: string;
  language: string;
  address: string | null;
  /** Current picture, or null. Resolved by the page via `avatarUrl`. */
  avatarUrl: string | null;
};

export function ProfileForm({ user }: { user: ProfileValues }) {
  const t = useT();
  const [state, formAction] = useActionState<ProfileState, FormData>(
    updateProfile,
    null,
  );

  const fieldErrors: ProfileFieldErrors =
    state && !state.ok ? state.fieldErrors : {};

  return (
    <form action={formAction} className="space-y-5">
      <AvatarField
        fieldName="avatar"
        removeFieldName="removeAvatar"
        userName={user.name}
        currentUrl={user.avatarUrl}
      />
      {fieldErrors.avatar ? (
        <p className="text-sm text-danger-text">{fieldErrors.avatar}</p>
      ) : null}

      <Field
        label={t("settings.fieldFullName")}
        name="name"
        error={fieldErrors.name}
      >
        <input
          id="name"
          name="name"
          defaultValue={user.name}
          autoComplete="name"
          className={inputClass(fieldErrors.name)}
        />
      </Field>

      <Field label={t("settings.fieldEmail")} name="email">
        <input
          id="email"
          name="email"
          value={user.email}
          readOnly
          disabled
          className="w-full cursor-not-allowed rounded-md border border-border bg-sunken px-3 py-2 text-sm text-muted"
        />
        <p className="text-xs text-muted">{t("settings.emailHint")}</p>
      </Field>

      <Field
        label={t("settings.fieldLanguage")}
        name="language"
        error={fieldErrors.language}
      >
        <select
          id="language"
          name="language"
          defaultValue={toLanguage(user.language)}
          className={inputClass(fieldErrors.language)}
        >
          {LANGUAGES.map((code) => (
            <option key={code} value={code}>
              {LANGUAGE_LABELS[code]}
            </option>
          ))}
        </select>
        {/* No longer a display-only preference: saving this switches the
            interface and moves the locale cookie with it. */}
        <p className="text-xs text-muted">{t("settings.languageHint")}</p>
      </Field>

      <Field
        label={t("settings.fieldAddress")}
        name="address"
        error={fieldErrors.address}
        optional
      >
        <textarea
          id="address"
          name="address"
          rows={3}
          defaultValue={user.address ?? ""}
          placeholder={t("settings.addressPlaceholder")}
          className={`${inputClass(fieldErrors.address)} resize-y`}
        />
      </Field>

      {state?.ok ? <FormSuccess>{state.message}</FormSuccess> : null}

      {state && !state.ok && state.formError ? (
        <FormError>{state.formError}</FormError>
      ) : null}

      <SubmitButton
        label={t("settings.saveProfile")}
        pendingLabel={t("common.saving")}
      />
    </form>
  );
}
