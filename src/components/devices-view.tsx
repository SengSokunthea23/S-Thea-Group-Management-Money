"use client";

import { useState, useTransition } from "react";
import {
  revokeOtherSessions,
  revokeSession,
} from "@/app/(app)/settings/devices/actions";
import { useT } from "@/components/i18n-provider";
import { FormError, FormSuccess } from "@/components/form-field";

export type DeviceRecord = {
  id: string;
  /** The session this page is being read from — never revocable from here. */
  isCurrent: boolean;
  /** "Chrome · Windows", already localised by the page. */
  label: string;
  browser: string | null;
  platform: string | null;
  mobile: boolean;
  ipAddress: string | null;
  lastSeen: string;
  signedIn: string;
  expires: string;
};

export function DevicesView({ devices }: { devices: DeviceRecord[] }) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<
    { ok: true; message: string } | { ok: false; error: string } | null
  >(null);

  // Two-step confirm for the bulk action, matching how row deletes work
  // elsewhere: it is one click away from cutting off every other machine.
  const [confirmingAll, setConfirmingAll] = useState(false);

  const others = devices.filter((device) => !device.isCurrent);

  function run(action: () => Promise<typeof result>) {
    startTransition(async () => {
      setResult(await action());
      setConfirmingAll(false);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-sm font-medium">{t("devices.heading")}</h2>
          <span className="text-sm text-muted">
            {t("devices.count", { count: devices.length })}
          </span>
        </div>

        {others.length > 0 ? (
          confirmingAll ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted">
                {t("devices.confirmAll", { count: others.length })}
              </span>
              <button
                type="button"
                disabled={pending}
                onClick={() => run(revokeOtherSessions)}
                className="rounded-md bg-danger px-2.5 py-1.5 text-sm font-medium text-danger-fg transition-colors hover:bg-danger-hover disabled:opacity-60"
              >
                {pending ? t("devices.signingOut") : t("common.confirm")}
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => setConfirmingAll(false)}
                className="rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-hover-soft hover:text-text"
              >
                {t("common.cancel")}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmingAll(true)}
              className="rounded-md border border-border px-3 py-2 text-sm font-medium text-danger-text transition-colors hover:bg-danger-surface"
            >
              {t("devices.signOutAll")}
            </button>
          )
        ) : null}
      </div>

      {result?.ok ? <FormSuccess>{result.message}</FormSuccess> : null}
      {result && !result.ok ? <FormError>{result.error}</FormError> : null}

      <ul className="overflow-hidden rounded-lg border border-border bg-surface">
        {devices.map((device) => (
          <li
            key={device.id}
            className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-5 py-4 last:border-b-0"
          >
            <DeviceIcon mobile={device.mobile} />

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{device.label}</span>
                {device.isCurrent ? (
                  <span className="badge badge-emerald">
                    {t("devices.thisDevice")}
                  </span>
                ) : null}
              </div>
              <div className="text-[13px] text-muted">
                {t("devices.detail", {
                  lastSeen: device.lastSeen,
                  signedIn: device.signedIn,
                })}
                {device.ipAddress ? ` · ${device.ipAddress}` : ""}
              </div>
            </div>

            {device.isCurrent ? null : (
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => revokeSession(device.id))}
                className="shrink-0 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-danger-surface hover:text-danger-text disabled:opacity-60"
              >
                {t("devices.signOutDevice")}
              </button>
            )}
          </li>
        ))}
      </ul>

      <p className="text-[13px] text-muted">{t("devices.note")}</p>
    </div>
  );
}

/**
 * Phone or desktop. The only distinction the parser can make reliably, and the
 * only one worth an icon — a wrong-looking silhouette is a useful prompt to
 * look closer at a session you don't recognise.
 */
function DeviceIcon({ mobile }: { mobile: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-9 shrink-0 items-center justify-center rounded-full bg-avatar text-avatar-fg"
    >
      <svg
        className="size-4"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {mobile ? (
          <>
            <rect x="5.75" y="2.5" width="8.5" height="15" rx="1.75" />
            <path d="M9 15h2" />
          </>
        ) : (
          <>
            <rect x="2.5" y="3.75" width="15" height="9.5" rx="1.5" />
            <path d="M7 16.25h6M10 13.25v3" />
          </>
        )}
      </svg>
    </span>
  );
}
