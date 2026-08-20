import { redirect } from "next/navigation";
import { DevicesView, type DeviceRecord } from "@/components/devices-view";
import { getCurrentSessionId, getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getLocale, getT } from "@/lib/preferences";
import { describeDevice, parseUserAgent } from "@/lib/device";
import { formatRelativeTime } from "@/lib/analysis";
import { formatDate } from "@/lib/date";

export const metadata = { title: "Devices" };

export const dynamic = "force-dynamic";

export default async function DevicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [currentId, locale, t] = await Promise.all([
    getCurrentSessionId(),
    getLocale(),
    getT(),
  ]);

  const now = new Date();

  // Expired rows are swept lazily elsewhere, so filter them here rather than
  // listing a device that is already locked out.
  const sessions = await prisma.session.findMany({
    where: { userId: user.id, expiresAt: { gt: now } },
    orderBy: { lastSeenAt: "desc" },
    select: {
      id: true,
      userAgent: true,
      ipAddress: true,
      lastSeenAt: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  // Everything display-shaped is resolved here: relative times and device
  // labels both need the locale, and the view is a client component that
  // should not be re-deriving them.
  const devices: DeviceRecord[] = sessions.map((session) => {
    const { browser, platform, mobile } = parseUserAgent(session.userAgent);

    return {
      id: session.id,
      isCurrent: session.id === currentId,
      label: describeDevice(session.userAgent, t("devices.unknownDevice"), " · "),
      browser,
      platform,
      mobile,
      ipAddress: session.ipAddress,
      lastSeen: formatRelativeTime(session.lastSeenAt, now, locale),
      signedIn: formatDate(session.createdAt),
      expires: formatDate(session.expiresAt),
    };
  });

  return <DevicesView devices={devices} />;
}
