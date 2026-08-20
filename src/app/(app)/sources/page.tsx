import { redirect } from "next/navigation";
import { SourcesView } from "@/components/sources-view";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { SourceRecord } from "@/lib/finance";

export const metadata = { title: "Income sources" };

export const dynamic = "force-dynamic";

export default async function SourcesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await prisma.incomeSource.findMany({
    where: { userId: user.id },
    // Active first, then alphabetical: archived sources are history, and
    // history belongs at the bottom.
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      kind: true,
      active: true,
      note: true,
      // Totals come from the database rather than a second pass in JS: the
      // aggregate is what the table shows, and there is no reason to ship every
      // entry across just to add it up here.
      entries: { select: { amountCents: true }, where: { type: "INCOME" } },
    },
  });

  const sources: SourceRecord[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    kind: row.kind,
    active: row.active,
    note: row.note,
    totalCents: row.entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    entryCount: row.entries.length,
  }));

  return <SourcesView sources={sources} />;
}
