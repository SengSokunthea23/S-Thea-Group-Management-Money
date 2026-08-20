"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  pollQrLogin,
  startQrLogin,
  type QrChallenge,
  type QrPollState,
} from "@/app/login/recovery-actions";
import { useT } from "@/components/i18n-provider";
import { FormError } from "@/components/form-field";

const POLL_INTERVAL_MS = 2000;

/**
 * Shows the code and waits for the phone to approve it.
 *
 * The code is minted on a button press rather than on mount. Partly because
 * creating a sign-in request sets an httpOnly cookie, which Next only permits
 * from a server action — but mostly because a request is a database row, and
 * minting one for every crawler and stray refresh of a public page is a cost
 * with no reader behind it.
 *
 * Waiting is done by polling rather than a socket: the wait is bounded to two
 * minutes, a poll is one small request, and a persistent connection for a
 * screen this short-lived would be more machinery than the problem deserves.
 *
 * Nothing sensitive lives here. A poll only succeeds because the browser still
 * holds the cookie set when the request was created, and the session is minted
 * server-side — this component merely learns that it happened.
 */
export function QrSignIn() {
  const t = useT();
  const router = useRouter();

  const [challenge, setChallenge] = useState<QrChallenge | null>(null);
  const [state, setState] = useState<QrPollState>({ status: "pending" });
  const [remaining, setRemaining] = useState(0);
  const [busy, setBusy] = useState(false);

  // Guards a poll that resolves after the component has moved on — without it
  // a late response could overwrite "signedIn" with "pending".
  const settled = useRef(false);

  async function requestCode() {
    setBusy(true);
    setChallenge(null);
    setState({ status: "pending" });

    try {
      const next = await startQrLogin();
      settled.current = false;
      setChallenge(next);
      setRemaining(Math.ceil(next.ttlMs / 1000));
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!challenge || state.status !== "pending") return;

    const timer = setInterval(async () => {
      if (settled.current) return;

      const next = await pollQrLogin();
      if (settled.current) return;

      if (next.status !== "pending") {
        settled.current = true;
        setState(next);

        if (next.status === "signedIn") {
          // The session cookie was set on the action's response, so this
          // navigation carries it and lands inside the app.
          router.replace("/");
        }
      }
    }, POLL_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [challenge, state.status, router]);

  // Local countdown so the page shows the code going stale rather than sitting
  // there looking live. The server remains the authority on expiry.
  useEffect(() => {
    if (!challenge || state.status !== "pending") return;

    const timer = setInterval(() => {
      setRemaining((value) => (value > 0 ? value - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, [challenge, state.status]);

  if (state.status === "signedIn") {
    return (
      <p className="mt-6 rounded-md bg-success-surface px-3 py-2 text-sm text-success-text">
        {t("qr.signedIn")}
      </p>
    );
  }

  if (state.status === "rejected" || state.status === "expired") {
    return (
      <div className="mt-6 space-y-3">
        <FormError>
          {state.status === "rejected" ? t("qr.rejected") : t("qr.expired")}
        </FormError>
        <PrimaryButton
          onClick={requestCode}
          busy={busy}
          label={t("qr.newCode")}
          busyLabel={t("qr.preparing")}
        />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="mt-6">
        <PrimaryButton
          onClick={requestCode}
          busy={busy}
          label={t("qr.showCode")}
          busyLabel={t("qr.preparing")}
        />
      </div>
    );
  }

  const stale = remaining === 0;

  return (
    <div className="mt-6 space-y-4">
      <div
        // Generated server-side by the qrcode package from a URL we built
        // ourselves — no user input reaches it.
        dangerouslySetInnerHTML={{ __html: challenge.svg }}
        role="img"
        aria-label={t("qr.codeLabel")}
        className={`mx-auto w-56 overflow-hidden rounded-lg bg-white p-3 transition-opacity ${
          stale ? "opacity-40" : ""
        }`}
      />

      {stale ? (
        <PrimaryButton
          onClick={requestCode}
          busy={busy}
          label={t("qr.newCode")}
          busyLabel={t("qr.preparing")}
        />
      ) : (
        <p className="text-center text-sm text-muted">
          {t("qr.waiting", { seconds: remaining })}
        </p>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-muted transition-colors hover:text-text">
          {t("qr.cannotScan")}
        </summary>
        <p className="mt-2 break-all rounded-md border border-border bg-sunken px-3 py-2 font-mono text-xs">
          {challenge.approveUrl}
        </p>
      </details>
    </div>
  );
}

function PrimaryButton({
  onClick,
  busy,
  label,
  busyLabel,
}: {
  onClick: () => void;
  busy: boolean;
  label: string;
  busyLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className="w-full rounded-md bg-accent px-3 py-2 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
    >
      {busy ? busyLabel : label}
    </button>
  );
}
