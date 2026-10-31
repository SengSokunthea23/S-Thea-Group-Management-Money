"use client";

import { useState, useTransition } from "react";
import { useT } from "@/components/i18n-provider";

/**
 * Edit / Delete for a table row, with a two-step inline confirm rather than
 * `window.confirm()`: a native modal blocks the event loop and breaks the
 * page's visual language.
 *
 * The two actions are icon-only. A row already carries a date, a category, a
 * merchant and an amount, and repeating the same two words down every line adds
 * width without adding meaning — a pencil and a bin are read faster than they
 * are read out.
 *
 * The *confirmation* deliberately keeps its words. That is the one press here
 * that cannot be taken back, and it is not the place to make someone decode a
 * glyph. Every button below still carries its label for screen readers and as a
 * hover title.
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
    <div className="flex items-center justify-end gap-0.5">
      <IconButton
        label={t("common.edit")}
        onClick={onEdit}
        // Accent, the same blue as every link in the app: this is the ordinary,
        // reversible action.
        className="text-accent hover:bg-accent/10"
      >
        <PencilIcon />
      </IconButton>
      <IconButton
        label={t("common.delete")}
        onClick={() => setConfirming(true)}
        // Red, because that is what red is for. Colour is a second signal, not
        // the only one — the pencil and the bin still differ by shape, so the
        // pair stays distinguishable to a reader who cannot tell the two hues
        // apart.
        className="text-danger-text hover:bg-danger-surface"
      >
        <BinIcon />
      </IconButton>
    </div>
  );
}

/**
 * `aria-label` names the button for assistive technology; `title` gives the
 * same words to a pointer on hover. Sized to 32px square so it stays a
 * comfortable target on a touch screen despite the icon itself being small.
 *
 * The colour lives on the caller rather than here, because the two buttons say
 * different things and that difference is the point.
 */
function IconButton({
  label,
  onClick,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`flex size-8 items-center justify-center rounded-md transition-colors ${className}`}
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M13.44 3.44a1.5 1.5 0 0 1 2.12 0l1 1a1.5 1.5 0 0 1 0 2.12l-8.2 8.2-3.54.71.71-3.54Z" />
      <path d="m12.25 4.75 3 3" />
    </svg>
  );
}

function BinIcon() {
  return (
    <svg
      className="size-4"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3.75 5.5h12.5" />
      <path d="M8 5.5V4.25A1.25 1.25 0 0 1 9.25 3h1.5A1.25 1.25 0 0 1 12 4.25V5.5" />
      <path d="M5.5 5.5v9.75A1.75 1.75 0 0 0 7.25 17h5.5a1.75 1.75 0 0 0 1.75-1.75V5.5" />
      <path d="M8.5 8.75v4.5M11.5 8.75v4.5" />
    </svg>
  );
}
