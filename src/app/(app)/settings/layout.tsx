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
      <header className="flex h-16 items-center border-b border-border bg-surface px-8">
        <h1 className="text-[15px] font-semibold tracking-tight">
          {t("settings.title")}
        </h1>
      </header>

      <SettingsTabs />

      <div className="px-8 py-8">{children}</div>
    </>
  );
}
