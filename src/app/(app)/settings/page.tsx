import { redirect } from "next/navigation";
import { PasswordForm } from "@/components/password-form";
import { PhoneForm } from "@/components/phone-form";
import { ProfileForm } from "@/components/profile-form";
import {
  LanguageSwitcher,
  ThemeSwitcher,
} from "@/components/preference-switchers";
import { getCurrentUser } from "@/lib/auth";
import { avatarUrl } from "@/lib/avatar";
import { formatPhone } from "@/lib/phone";
import { getT, getTheme } from "@/lib/preferences";
import { prisma } from "@/lib/prisma";

export const metadata = { title: "Profile" };

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const session = await getCurrentUser();
  if (!session) redirect("/login");

  const [user, t, theme] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      // avatarUpdatedAt, never avatarData: the bytes belong in the image
      // request, not in this page's payload.
      select: {
        name: true,
        email: true,
        language: true,
        address: true,
        avatarUpdatedAt: true,
        phone: true,
        phoneVerifiedAt: true,
      },
    }),
    getT(),
    getTheme(),
  ]);
  if (!user) redirect("/login");

  return (
    /*
      Two columns from `lg` up, because one narrow column left most of a desktop
      screen empty and pushed the recovery phone below the fold for no reason.

      Two explicit columns rather than a flowing grid: the sections are wildly
      different heights, and letting a grid place them would strand a short card
      beside a tall one with a gap under it. Split by weight instead — the tall
      profile form takes one side, the three shorter cards stack on the other,
      and the two sides come out roughly level.

      Below `lg` they stack in source order, which is why Appearance leads: it
      is the section that changes the page you are looking at, so it belongs
      where the eye lands.
    */
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        {/*
          Language appears here and in the profile form: this one is instant and
          browser-local, that one saves to the account. Both write the same
          preference.
        */}
        <Section
          heading={t("settings.appearanceHeading")}
          description={t("settings.appearanceDescription")}
        >
          <div className="space-y-3">
            <LanguageSwitcher />
            <ThemeSwitcher current={theme} />
          </div>
        </Section>

        <Section
          heading={t("settings.profileHeading")}
          description={t("settings.profileDescription")}
        >
          <ProfileForm
            user={{
              ...user,
              avatarUrl: avatarUrl(session.id, user.avatarUpdatedAt),
            }}
          />
        </Section>
      </div>

      <div className="space-y-6">
        <Section
          heading={t("settings.passwordHeading")}
          description={t("settings.passwordDescription")}
        >
          <PasswordForm />
        </Section>

        {/* After the password on purpose: it is the way back in when the
            password beside it is the thing you have lost. */}
        <Section
          heading={t("phone.heading")}
          description={t("phone.description")}
        >
          <PhoneForm
            phone={user.phone ? formatPhone(user.phone) : null}
            verified={user.phoneVerifiedAt !== null}
          />
        </Section>
      </div>
    </div>
  );
}

function Section({
  heading,
  description,
  children,
}: {
  heading: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface">
      <div className="border-b border-border px-5 py-3">
        <h2 className="text-sm font-medium">{heading}</h2>
        <p className="mt-0.5 text-[13px] text-muted">{description}</p>
      </div>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}
