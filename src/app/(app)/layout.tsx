import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { PlannerLauncher } from "@/components/planner-launcher";
import { getCurrentUser } from "@/lib/auth";
import { getNavState, getTheme } from "@/lib/preferences";

/**
 * Every route inside this group is behind the session check. Middleware only
 * sees whether a cookie exists — this is where the session is actually
 * validated against the database.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Passed down rather than read in the client: the switcher needs to show
  // which of the three modes is selected, and "system" is indistinguishable
  // from "light" or "dark" once the browser has resolved it.
  const [theme, navState] = await Promise.all([getTheme(), getNavState()]);

  return (
    <div className="flex min-h-screen">
      <AppSidebar user={user} theme={theme} navState={navState} />
      {/* pt-14 clears the fixed mobile top bar; the desktop rail has none. */}
      <main className="min-w-0 flex-1 pt-14 md:pt-0">{children}</main>

      {/* Reachable from every screen inside the app, because the question it
          answers tends to occur to you while you are looking at something
          else. It reads the ledger and never writes to it. */}
      <PlannerLauncher />
    </div>
  );
}
