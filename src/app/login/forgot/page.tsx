import Link from "next/link";
import { redirect } from "next/navigation";
import { PhoneRecoveryForm } from "@/components/phone-recovery-form";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";

export const metadata = { title: "Forgot password" };

export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  // Already signed in — there is nothing to recover.
  if (await getCurrentUser()) redirect("/");

  const t = await getT();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold tracking-tight">
          {t("recovery.title")}
        </h1>
        <p className="mt-1 text-sm text-muted">{t("recovery.subtitle")}</p>

        <PhoneRecoveryForm />

        {/*
          The second route. Offered as an alternative rather than a tab, because
          it is not really password recovery: it signs this browser in from a
          device that is already signed in, leaving the password untouched.
        */}
        <div className="mt-8 border-t border-border pt-5">
          <h2 className="text-sm font-medium">{t("recovery.qrHeading")}</h2>
          <p className="mt-1 text-sm text-muted">
            {t("recovery.qrDescription")}
          </p>
          <Link
            href="/login/qr"
            className="mt-3 inline-block rounded-md border border-border px-3 py-2 text-sm font-medium transition-colors hover:bg-hover"
          >
            {t("recovery.qrAction")}
          </Link>
        </div>

        <div className="mt-8 text-sm">
          <Link href="/login" className="text-accent hover:underline">
            {t("recovery.backToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}
