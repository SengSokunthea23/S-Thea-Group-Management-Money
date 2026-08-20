"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";

/**
 * Edit / Delete for a table row, with a two-step inline confirm rather than
 * `window.confirm()`: a native modal blocks the event loop and breaks the
 * page's visual language.
 *
 * Contacts and deals had a byte-for-byte identical copy of this each; the only
 * difference was which server action ran, so that is the only thing passed in.
 */
export function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => Promise<unknown>;
}) {
  const t = useT();
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      await onDelete();
      setConfirming(false);
    });
  }

  if (confirming) {
    return (
      <div className="flex items-center justify-end gap-2">
        <span className="text-sm text-muted">{t("common.deletePrompt")}</span>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending}
          className="rounded-md bg-danger px-2.5 py-1.5 text-sm font-medium text-danger-fg transition-colors hover:bg-danger-hover disabled:opacity-60"
        >
          {pending ? t("common.deleting") : t("common.confirm")}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-md border border-border px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-hover-soft hover:text-text"
        >
          {t("common.cancel")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={onEdit}
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-hover hover:text-text"
      >
        {t("common.edit")}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-md px-2.5 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-danger-surface hover:text-danger-text"
      >
        {t("common.delete")}
      </button>
    </div>
  );
}
