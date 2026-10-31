"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useT } from "@/components/i18n-provider";
import type { MessageKey } from "@/lib/i18n/translate";

const TABS: { href: string; label: MessageKey }[] = [
  { href: "/settings", label: "settings.tabProfile" },
  { href: "/settings/categories", label: "settings.tabCategories" },
  { href: "/settings/recurring", label: "settings.tabRecurring" },
  { href: "/settings/devices", label: "settings.tabDevices" },
  { href: "/settings/members", label: "settings.tabMembers" },
];

export function SettingsTabs() {
  const pathname = usePathname();
  const t = useT();

  return (
    /*
      Five tabs; the strip scrolls rather than wrapping or squeezing, since
      Khmer labels run considerably wider than the English ones.

      The `border-b` belongs to this nav rather than to the sticky wrapper
      around it, and that is load-bearing: each tab draws a 2px underline pulled
      down one pixel (`-mb-px`) so the active one sits *over* this line rather
      than above it. Move the border to an ancestor and the underline has
      nothing to overlap — which is exactly how it went missing.
    */
    <nav className="scroll-strip flex gap-1 overflow-x-auto overflow-y-hidden border-b border-border px-4 sm:px-8">
      {TABS.map(({ href, label }) => {
        // Exact match: /settings must not stay active on /settings/members.
        const active = pathname === href;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            // 3px, not 2. A 2px rule is 1.4 device pixels at the ~70% browser
            // zoom this is often read at, and an indigo hairline against a dark
            // surface is close to invisible. Three survives the rounding.
            className={`-mb-px whitespace-nowrap border-b-[3px] px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "border-accent text-text"
                : "border-transparent text-muted hover:border-border hover:text-text"
            }`}
          >
            {t(label)}
          </Link>
        );
      })}
    </nav>
  );
}
