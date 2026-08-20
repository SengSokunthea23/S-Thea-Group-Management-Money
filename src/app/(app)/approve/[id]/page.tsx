import { redirect } from "next/navigation";
import { ApprovalPrompt } from "@/components/approval-prompt";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { describeDevice } from "@/lib/device";
import { getLocale, getT } from "@/lib/preferences";
import { formatRelativeTime } from "@/lib/analysis";

export const metadata = { title: "Approve sign-in" };

export const dynamic = "force-dynamic";

/**
 * The screen the QR opens on the phone.
 *
 * It lives inside the authenticated route group on purpose: scanning while
 * signed out lands on /login instead, which is exactly right — an approval is
 * only meaningful from a device that is already the account.
 */
export default async function ApprovePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [{ id }, locale, t] = await Promise.all([params, getLocale(), getT()]);

  const request = await prisma.loginRequest.findUnique({
    where: { id },
    select: {
      status: true,
      userAgent: true,
      ipAddress: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  const now = new Date();
  const expired = !request || request.expiresAt <= now;

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <ApprovalPrompt
        requestId={id}
        expired={expired}
        status={request?.status ?? "PENDING"}
        accountName={user.name}
        accountEmail={user.email}
        device={
          request
            ? describeDevice(request.userAgent, t("devices.unknownDevice"), " · ")
            : t("devices.unknownDevice")
        }
        ipAddress={request?.ipAddress ?? null}
        requestedAt={
          request ? formatRelativeTime(request.createdAt, now, locale) : ""
        }
      />
    </div>
  );
}
