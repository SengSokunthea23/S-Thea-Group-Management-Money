"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { signOut } from "@/app/login/actions";
import { useT } from "@/components/i18n-provider";
import {
  LanguageSwitcher,
  ThemeSwitcher,
} from "@/components/preference-switchers";
import { Avatar } from "@/components/avatar";
import type { SessionUser } from "@/lib/auth";
import type { Theme } from "@/lib/theme";

export function UserMenu({
  user,
  theme,
  compact = false,
}: {
  user: SessionUser;
  theme: Theme;
  /** Collapsed rail: the avatar alone, with the panel still full width. */
  compact?: boolean;
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative mt-auto shrink-0 border-t border-border bg-surface p-3"
    >
      {open ? (
        <div
          role="menu"
          // The panel keeps its own width when the rail is narrow — a language
          // and theme switcher cannot usefully be squeezed into 64px.
          className={`absolute bottom-full mb-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg ${
            compact ? "left-2 w-60" : "left-3 right-3"
          }`}
        >
          {/*
            Language and theme live here rather than buried in Settings: they
            are the two switches a user reaches for mid-task, and the menu is
            already one click from anywhere in the app. The Settings form still
            saves language to the account — this only moves the same choice
            closer to hand.
          */}
          <div className="space-y-2.5 border-b border-border px-3 py-3">
            <LanguageSwitcher />
            <ThemeSwitcher current={theme} />
          </div>

          <div className="py-1">
            <button
              type="button"
              role="menuitem"
              disabled={pending}
              onClick={() => startTransition(() => void signOut())}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-medium text-muted transition-colors hover:bg-hover-soft hover:text-text disabled:opacity-60"
            >
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
                <path d="M12.5 6.5V4.75A1.25 1.25 0 0 0 11.25 3.5h-5A1.25 1.25 0 0 0 5 4.75v10.5a1.25 1.25 0 0 0 1.25 1.25h5a1.25 1.25 0 0 0 1.25-1.25V13.5" />
                <path d="M8.5 10h8m0 0-2.25-2.25M16.5 10l-2.25 2.25" />
              </svg>
              {pending ? t("common.signingOut") : t("common.signOut")}
            </button>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={compact ? `${user.name} · ${user.email}` : undefined}
        className={`flex w-full items-center rounded-md py-1.5 text-left transition-colors hover:bg-hover-soft ${
          compact ? "justify-center px-1" : "gap-2.5 px-2"
        }`}
      >
        <Avatar
          userId={user.id}
          name={user.name}
          avatarUpdatedAt={user.avatarUpdatedAt}
          size={28}
        />
        {compact ? null : (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">
                {user.name}
              </span>
              <span className="block truncate text-xs text-muted">
                {user.email}
              </span>
            </span>
            <ChevronIcon />
          </>
        )}
      </button>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg
      className="size-4 shrink-0 text-muted"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m7.5 8.5 2.5-2.5 2.5 2.5m-5 3 2.5 2.5 2.5-2.5" />
    </svg>
  );
}
