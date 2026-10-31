"use client";

import { useT } from "@/components/i18n-provider";
import { APP_INITIAL } from "@/lib/app";

/**
 * The badge-and-name lockup. The sidebar rail, the mobile drawer and the login
 * page all render it; it was copied between them before, which is exactly how a
 * rename ends up half-applied.
 */
export function Wordmark({ compact = false }: { compact?: boolean }) {
  const t = useT();

  // Collapsed, the badge alone stands in for the name. It keeps the accessible
  // name via the title so the rail still identifies the product.
  if (compact) {
    return (
      <span
        title={t("common.appName")}
        className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-[13px] font-semibold text-accent-fg"
      >
        {APP_INITIAL}
      </span>
    );
  }

  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-[13px] font-semibold text-accent-fg">
        {APP_INITIAL}
      </span>
      <span className="truncate text-[15px] font-semibold tracking-tight">
        {t("common.appName")}
      </span>
    </span>
  );
}
