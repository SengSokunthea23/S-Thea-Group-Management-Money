"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/translate";

const TABS: { href: string; label: MessageKey }[] = [
  { href: "/settings", label: "settings.tabProfile" },
  { href: "/settings/devices", label: "settings.tabDevices" },
  { href: "/settings/members", label: "settings.tabMembers" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const t = useT();

  return (
    <nav className="flex gap-1 border-b border-border bg-surface px-8">
      {TABS.map(({ href, label }) => {
        // Exact match: /settings must not stay active on /settings/members.
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-accent text-text"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
