"use client";

import { useEffect, useRef, useState } from "react";
import { getPlannerBaseline } from "@/app/(app)/planner-actions";
import { useT } from "@/components/i18n-provider";
import { PlannerPanel } from "@/components/planner-panel";
import type { PlannerBaseline } from "@/lib/planner";

/**
 * The floating button that opens the planner, and the panel it opens.
 *
 * A bubble in the corner rather than a page of its own, for the same reason a
 * help widget is one: the question it answers — "if I spend like this, is there
 * anything left?" — occurs to you *while* you are looking at something else.
 * Sending you to another screen to ask it would lose the thing that prompted it.
 *
 * The baseline is fetched the first time it opens, not with every page. Most
 * page views never open this, and it is three queries.
 */
export function PlannerLauncher() {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [baseline, setBaseline] = useState<PlannerBaseline | null>(null);
  const [failed, setFailed] = useState(false);

  // Kept across closes: reopening should return you to the panel you were
  // reading, not to a spinner and a fresh set of numbers.
  const loaded = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);

  async function toggle() {
    const next = !open;
    setOpen(next);

    if (!next || loaded.current) return;

    loaded.current = true;
    const data = await getPlannerBaseline();
    if (data) setBaseline(data);
    else {
      setFailed(true);
      loaded.current = false;
    }
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="false"
          aria-label={t("planner.title")}
          /*
            Anchored to the button on a wide screen, near-full-width on a phone.
            Not `aria-modal`: this is a companion to the page, not a takeover —
            you are meant to be able to read the figures behind it while you
            change the ones in front.
          */
          // 30rem rather than 26: the spending categories sit two to a row, and
          // at the narrower width each column had no room for a name badge
          // above a figure without one or the other truncating.
          className="animate-drawer-in fixed inset-x-3 bottom-20 z-40 flex max-h-[min(34rem,calc(100dvh-7rem))] flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-2xl sm:inset-x-auto sm:right-5 sm:w-[30rem]"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-5 py-3">
            <div>
              <h2 className="text-[15px] font-semibold tracking-tight">
                {t("planner.title")}
              </h2>
              <p className="mt-0.5 text-[13px] text-muted">
                {t("planner.subtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label={t("common.closePanel")}
              className="-mr-1.5 shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-text"
            >
              <svg
                className="size-4"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="m5.5 5.5 9 9m0-9-9 9" />
              </svg>
            </button>
          </div>

          {failed ? (
            <p className="px-5 py-8 text-center text-sm text-danger-text">
              {t("settings.errors.sessionExpired")}
            </p>
          ) : baseline ? (
            <PlannerPanel baseline={baseline} />
          ) : (
            <div className="space-y-3 px-5 py-6" aria-hidden="true">
              <div className="h-20 animate-pulse rounded-lg bg-sunken" />
              <div className="h-9 animate-pulse rounded-md bg-sunken" />
              <div className="h-9 animate-pulse rounded-md bg-sunken" />
            </div>
          )}
        </div>
      ) : null}

      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={t("planner.title")}
        title={t("planner.title")}
        className="fixed right-5 bottom-5 z-40 flex size-12 items-center justify-center rounded-full bg-accent text-accent-fg shadow-lg transition-colors hover:bg-accent-hover"
      >
        {open ? (
          <svg
            className="size-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="m5.5 5.5 9 9m0-9-9 9" />
          </svg>
        ) : (
          <CalculatorIcon />
        )}
      </button>
    </>
  );
}

function CalculatorIcon() {
  return (
    <svg
      className="size-5"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="4" y="2.5" width="12" height="15" rx="2" />
      <path d="M7 6h6" />
      <path d="M7.5 10h.01M10 10h.01M12.5 10h.01M7.5 13.5h.01M10 13.5h.01M12.5 13.5h.01" />
    </svg>
  );
}
