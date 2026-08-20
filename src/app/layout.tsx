import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Khmer } from "next/font/google";
import { I18nProvider } from "@/components/i18n-provider";
import { APP_NAME } from "@/lib/app";
import { LOCALE_TAGS } from "@/lib/i18n/config";
import { getLocale, getTheme } from "@/lib/preferences";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Loaded unconditionally rather than per locale: the font stack in globals.css
// lists Geist first and this second, so the browser falls through to it only
// for Khmer glyphs. That keeps a mixed en/km string — a Khmer name in an
// English UI — rendering correctly either way.
const notoKhmer = Noto_Sans_Khmer({
  variable: "--font-noto-khmer",
  subsets: ["khmer"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  // `template` appends the product name to every page title, so the pages below
  // only name themselves and the brand is written down exactly once.
  title: {
    default: APP_NAME,
    template: `%s · ${APP_NAME}`,
  },
  description: "Contact and deal management",
};

// The app shell lives in (app)/layout.tsx, behind the session check — this
// layout is shared with /login, which must render without a sidebar. Both the
// locale and the theme are resolved here so that /login is translated and
// themed too, before there is a session to read a preference from.
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [locale, theme] = await Promise.all([getLocale(), getTheme()]);

  return (
    <html
      lang={LOCALE_TAGS[locale]}
      // Rendered server-side from the cookie, so the first paint is already the
      // right palette — no flash, and no blocking script in <head>.
      data-theme={theme}
      className={`${geistSans.variable} ${geistMono.variable} ${notoKhmer.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-canvas font-sans text-text"
        suppressHydrationWarning
      >
        <I18nProvider locale={locale}>{children}</I18nProvider>
      </body>
    </html>
  );
}
