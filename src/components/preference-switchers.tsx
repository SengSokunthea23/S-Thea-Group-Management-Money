"use client";

import { useEffect, useOptimistic, useTransition } from "react";
import { setLocale, setTheme } from "@/app/preferences-actions";
import { useI18n, useT } from "@/components/i18n-provider";
import { LOCALES, LOCALE_SHORT_LABELS, type Locale } from "@/lib/i18n/config";
import { THEMES, type Theme } from "@/lib/theme";

/**
 * Both switchers are the same segmented control: a small row of buttons where
 * the active one is filled. A <select> would need a label and a click to reveal
 * two or three options — at this size the options are cheaper shown than hidden.
 */
function Segmented({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[13px] text-muted">{label}</span>
      <div
        role="group"
        aria-label={label}
        className="flex gap-0.5 rounded-md bg-sunken p-0.5"
      >
        {children}
      </div>
    </div>
  );
}

function SegmentButton({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={`flex min-w-8 items-center justify-center gap-1 rounded-[5px] px-2 py-1 text-xs font-medium transition-colors ${
        active
          ? "bg-surface text-text shadow-sm"
          : "text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

export function LanguageSwitcher() {
  const { locale } = useI18n();
  const t = useT();
  const [, startTransition] = useTransition();

  // The whole tree re-renders in the new language once the action resolves;
  // until then the optimistic value keeps the pressed segment from snapping
  // back under the pointer.
  const [selected, select] = useOptimistic(locale);

  function choose(next: Locale) {
    if (next === locale) return;

    startTransition(async () => {
      select(next);
      await setLocale(next);
    });
  }

  return (
    <Segmented label={t("preferences.language")}>
      {LOCALES.map((code) => (
        <SegmentButton
          key={code}
          active={code === selected}
          onClick={() => choose(code)}
        >
          {LOCALE_SHORT_LABELS[code]}
        </SegmentButton>
      ))}
    </Segmented>
  );
}

const THEME_LABEL_KEYS = {
  light: "preferences.themeLight",
  dark: "preferences.themeDark",
  system: "preferences.themeSystem",
} as const;

const THEME_ICONS: Record<Theme, (props: { className?: string }) => React.ReactElement> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

export function ThemeSwitcher({ current }: { current: Theme }) {
  const t = useT();
  const [, startTransition] = useTransition();
  const [selected, select] = useOptimistic(current);

  // The whole stylesheet keys off this one attribute, so mirroring the
  // optimistic value onto <html> repaints the app as soon as the button is
  // pressed instead of after the server round trip. Writing it from an effect
  // rather than the click handler keeps the mutation out of render-adjacent
  // code — and it also restores the old palette if the action fails and the
  // optimistic value rolls back.
  useEffect(() => {
    document.documentElement.dataset.theme = selected;
  }, [selected]);

  function choose(next: Theme) {
    if (next === selected) return;

    startTransition(async () => {
      select(next);
      await setTheme(next);
    });
  }

  return (
    <Segmented label={t("preferences.theme")}>
      {THEMES.map((theme) => {
        const Icon = THEME_ICONS[theme];
        const label = t(THEME_LABEL_KEYS[theme]);

        return (
          <SegmentButton
            key={theme}
            active={theme === selected}
            onClick={() => choose(theme)}
            title={label}
          >
            <Icon className="size-3.5" />
            <span className="sr-only">{label}</span>
          </SegmentButton>
        );
      })}
    </Segmented>
  );
}

function SunIcon({ className }: { className?: string }) {
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
      <circle cx="10" cy="10" r="3.25" />
      <path d="M10 2.5v1.75M10 15.75v1.75M17.5 10h-1.75M4.25 10H2.5M15.3 4.7l-1.24 1.24M5.94 14.06 4.7 15.3M15.3 15.3l-1.24-1.24M5.94 5.94 4.7 4.7" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
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
      <path d="M16.5 11.75A6.75 6.75 0 0 1 8.25 3.5a6.75 6.75 0 1 0 8.25 8.25Z" />
    </svg>
  );
}

function MonitorIcon({ className }: { className?: string }) {
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
      <rect x="2.5" y="3.75" width="15" height="9.5" rx="1.5" />
      <path d="M7 16.25h6M10 13.25v3" />
    </svg>
  );
}
