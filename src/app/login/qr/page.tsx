import Link from "next/link";
import { redirect } from "next/navigation";
import { QrSignIn } from "@/components/qr-sign-in";
import { Wordmark } from "@/components/wordmark";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";

export const metadata = { title: "Sign in with a QR code" };

export const dynamic = "force-dynamic";

/**
 * A shell. The code itself is minted by a server action from the client on
 * mount — creating a sign-in request sets an httpOnly cookie, and Next only
 * allows that from an action or a route handler, never while rendering a page.
 */
export default async function QrLoginPage() {
  if (await getCurrentUser()) redirect("/");

  const t = await getT();

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <Wordmark />
        </div>

        <h1 className="text-xl font-semibold tracking-tight">{t("qr.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("qr.subtitle")}</p>

        <QrSignIn />

        <div className="mt-8 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          <Link href="/login" className="text-accent hover:underline">
            {t("recovery.backToLogin")}
          </Link>
          <Link href="/login/forgot" className="text-muted hover:underline">
            {t("qr.usePhoneInstead")}
          </Link>
        </div>
      </div>
    </div>
  );
}
