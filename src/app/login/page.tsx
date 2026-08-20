import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { Wordmark } from "@/components/wordmark";
import {
  LanguageSwitcher,
  ThemeSwitcher,
} from "@/components/preference-switchers";
import { getCurrentUser } from "@/lib/auth";
import { getT, getTheme } from "@/lib/preferences";

export const metadata = { title: "Sign in" };

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already signed in — don't show the form again.
  if (await getCurrentUser()) redirect("/");

  const [t, theme] = await Promise.all([getT(), getTheme()]);

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold tracking-tight">
          {t("login.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("login.subtitle")}</p>

        <LoginForm />

        {/*
          Both switchers are reachable before sign-in. Someone who cannot read
          the form has no way to get past it otherwise, and the theme should not
          have to wait for a session either.
        */}
        <div className="mt-10 space-y-2.5 border-t border-border pt-5">
          <LanguageSwitcher />
          <ThemeSwitcher current={theme} />
        </div>
      </div>
    </div>
  );
}
