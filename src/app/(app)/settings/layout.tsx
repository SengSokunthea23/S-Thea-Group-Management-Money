import { PageHeader } from "@/components/page-header";
import { SettingsTabs } from "@/components/settings-tabs";
import { getT } from "@/lib/preferences";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getT();

  return (
    <>
      {/*
        Only the tabs are pinned. The title reads "Settings" on every one of
        these five screens, so holding it against the top spends a strip of a
        phone screen restating something that never changes — while the tabs
        underneath are the part you actually reach for.
      */}
      <div className="flex h-16 items-center bg-surface px-4 sm:px-8">
        <h1 className="text-[15px] font-semibold tracking-tight">
          {t("settings.title")}
        </h1>
      </div>

      <PageHeader bordered={false}>
        <SettingsTabs />
      </PageHeader>

      <div className="px-4 py-6 sm:px-8 sm:py-8">{children}</div>
    </>
  );
}
