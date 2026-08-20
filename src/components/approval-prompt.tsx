"use client";

import { useState, useTransition } from "react";
import {
  approveLoginRequest,
  rejectLoginRequest,
  type ApprovalState,
} from "@/app/(app)/approve/[id]/actions";
import { useT } from "@/components/i18n-provider";
import { FormError, FormSuccess } from "@/components/form-field";

/**
 * The approval screen.
 *
 * The residual risk in QR sign-in is not someone stealing the code — it is
 * someone putting a code in front of *you* and hoping you approve their
 * browser into your account. Nothing technical can prevent that; only the
 * reader can. So this screen leads with what is being let in, states plainly
 * which account it would reach, and warns before the button rather than after.
 */
export function ApprovalPrompt({
  requestId,
  expired,
  status,
  accountName,
  accountEmail,
  device,
  ipAddress,
  requestedAt,
}: {
  requestId: string;
  expired: boolean;
  status: string;
  accountName: string;
  accountEmail: string;
  device: string;
  ipAddress: string | null;
  requestedAt: string;
}) {
  const t = useT();
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<ApprovalState>(null);

  const decided = status !== "PENDING";

  function decide(action: () => Promise<ApprovalState>) {
    startTransition(async () => setResult(await action()));
  }

  if (expired) {
    return (
      <Card title={t("approve.title")}>
        <FormError>{t("approve.errors.expired")}</FormError>
      </Card>
    );
  }

  if (result?.ok) {
    return (
      <Card title={t("approve.title")}>
        {result.approved ? (
          <FormSuccess>{t("approve.approved")}</FormSuccess>
        ) : (
          <FormError>{t("approve.rejected")}</FormError>
        )}
      </Card>
    );
  }

  if (decided) {
    return (
      <Card title={t("approve.title")}>
        <FormError>{t("approve.errors.alreadyDecided")}</FormError>
      </Card>
    );
  }

  return (
    <Card title={t("approve.title")}>
      <p className="text-sm text-muted">{t("approve.subtitle")}</p>

      <dl className="mt-4 space-y-2 rounded-md border border-border bg-sunken px-4 py-3 text-sm">
        <Row label={t("approve.device")} value={device} />
        {ipAddress ? <Row label={t("approve.ip")} value={ipAddress} /> : null}
        <Row label={t("approve.requested")} value={requestedAt} />
        <Row
          label={t("approve.account")}
          value={`${accountName} · ${accountEmail}`}
        />
      </dl>

      {/* Placed above the buttons deliberately: a caution read after the tap
          is decoration. */}
      <p className="mt-4 rounded-md bg-danger-surface px-3 py-2 text-sm text-danger-text">
        {t("approve.warning")}
      </p>

      {result && !result.ok ? (
        <div className="mt-3">
          <FormError>{result.error}</FormError>
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-2">
        {/* Reject leads. The safe choice should be the easy one when someone is
            unsure, and unsure is the state this screen is designed for. */}
        <button
          type="button"
          disabled={pending}
          onClick={() => decide(() => rejectLoginRequest(requestId))}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-hover disabled:opacity-60"
        >
          {t("approve.reject")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => decide(() => approveLoginRequest(requestId))}
          className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? t("common.saving") : t("approve.approve")}
        </button>
      </div>
    </Card>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-6">
      <h1 className="text-[15px] font-semibold tracking-tight">{title}</h1>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-0.5">
      <dt className="text-muted">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
