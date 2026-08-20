"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { UserMenu } from "@/components/user-menu";
import { Wordmark } from "@/components/wordmark";
import { useT } from "@/components/i18n-provider";
import type { SessionUser } from "@/lib/auth";
import type { MessageKey } from "@/lib/i18n/translate";
import type { Theme } from "@/lib/theme";

// Labels are catalogue keys, resolved at render — a plain string here would
// freeze the nav in whatever language it was written in.
const NAV_ITEMS: { href: string; label: MessageKey; icon: typeof AnalysisIcon }[] =
  [
    { href: "/", label: "nav.dashboard", icon: AnalysisIcon },
    { href: "/entries", label: "nav.entries", icon: LedgerIcon },
    { href: "/sources", label: "nav.sources", icon: SourcesIcon },
    { href: "/settings", label: "nav.settings", icon: SettingsIcon },
  ];

// "/" needs an exact match — prefix matching would mark it active everywhere.
function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Nav links, shared by the desktop rail and the mobile drawer. */
function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);

        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-hover text-text"
                : "text-muted hover:bg-hover-soft hover:text-text"
            }`}
          >
            <Icon className="size-4" />
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppSidebar({
  user,
  theme,
}: {
  user: SessionUser;
  theme: Theme;
}) {
  const pathname = usePathname();
  const t = useT();
  const [open, setOpen] = useState(false);

  // Navigating closes the drawer, including via browser back/forward, which a
  // click handler alone would miss. Adjusted during render rather than in an
  // effect — no cascading re-render, and no flash of an open drawer.
  const [renderedPath, setRenderedPath] = useState(pathname);
  if (renderedPath !== pathname) {
    setRenderedPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);

    // Stop the page behind the drawer from scrolling.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <>
      {/* Mobile top bar — the only way into the nav below md. */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4 md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t("common.openNavigation")}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="-ml-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-text"
        >
          <svg
            className="size-5"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M3.5 6h13M3.5 10h13M3.5 14h13" />
          </svg>
        </button>
        <Wordmark />
      </header>

      {/* Mobile drawer */}
      {open ? (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <button
            type="button"
            aria-label={t("common.closeNavigation")}
            onClick={() => setOpen(false)}
            className="animate-backdrop-in absolute inset-0 cursor-default bg-backdrop"
          />

          <div
            id="mobile-nav"
            role="dialog"
            aria-modal="true"
            aria-label={t("common.navigation")}
            className="animate-drawer-in-left relative flex h-full w-64 flex-col border-r border-border bg-surface shadow-xl"
          >
            <div className="flex h-14 items-center justify-between px-4">
              <Wordmark />
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t("common.closeNavigation")}
                className="-mr-1.5 rounded-md p-1.5 text-muted transition-colors hover:bg-hover hover:text-text"
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

            <SidebarNav onNavigate={() => setOpen(false)} />
            <UserMenu user={user} theme={theme} />
          </div>
        </div>
      ) : null}

      {/*
        Desktop rail. Pinned to the viewport so nav and Sign out stay reachable
        on a long list. An explicit h-screen (plus self-start) stops the flex
        parent from stretching it to the full page height — without that,
        `sticky` has no room to travel and the rail just scrolls away.
      */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-surface md:sticky md:top-0 md:flex md:h-screen md:self-start md:overflow-y-auto">
        <div className="flex h-16 shrink-0 items-center px-5">
          <Wordmark />
        </div>

        <SidebarNav />
        <UserMenu user={user} theme={theme} />
      </aside>
    </>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="2.5" />
      <path d="M16.1 12.3a1.4 1.4 0 0 0 .28 1.54l.05.05a1.7 1.7 0 1 1-2.4 2.4l-.05-.05a1.4 1.4 0 0 0-1.54-.28 1.4 1.4 0 0 0-.85 1.28v.14a1.7 1.7 0 1 1-3.4 0v-.07a1.4 1.4 0 0 0-.92-1.28 1.4 1.4 0 0 0-1.54.28l-.05.05a1.7 1.7 0 1 1-2.4-2.4l.05-.05a1.4 1.4 0 0 0 .28-1.54 1.4 1.4 0 0 0-1.28-.85h-.14a1.7 1.7 0 1 1 0-3.4h.07a1.4 1.4 0 0 0 1.28-.92 1.4 1.4 0 0 0-.28-1.54l-.05-.05a1.7 1.7 0 1 1 2.4-2.4l.05.05a1.4 1.4 0 0 0 1.54.28h.07a1.4 1.4 0 0 0 .85-1.28v-.14a1.7 1.7 0 1 1 3.4 0v.07a1.4 1.4 0 0 0 .85 1.28 1.4 1.4 0 0 0 1.54-.28l.05-.05a1.7 1.7 0 1 1 2.4 2.4l-.05.05a1.4 1.4 0 0 0-.28 1.54v.07a1.4 1.4 0 0 0 1.28.85h.14a1.7 1.7 0 1 1 0 3.4h-.07a1.4 1.4 0 0 0-1.28.85Z" />
    </svg>
  );
}

function AnalysisIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2.75" y="2.75" width="6" height="6" rx="1.25" />
      <rect x="11.25" y="2.75" width="6" height="6" rx="1.25" />
      <rect x="2.75" y="11.25" width="6" height="6" rx="1.25" />
      <rect x="11.25" y="11.25" width="6" height="6" rx="1.25" />
    </svg>
  );
}

function LedgerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4.5 3.5h11a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-11a1 1 0 0 1 1-1Z" />
      <path d="M7 7.5h6M7 10h6M7 12.5h3.5" />
    </svg>
  );
}

function SourcesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="4.75" cy="4.75" r="1.75" />
      <circle cx="4.75" cy="10" r="1.75" />
      <circle cx="4.75" cy="15.25" r="1.75" />
      <path d="M6.5 4.75h3.25a2 2 0 0 1 2 2V13a2 2 0 0 0 2 2h1.75M6.5 10h7.5M6.5 15.25h1.25" />
    </svg>
  );
}
