import { redirect } from "next/navigation";
import { EntriesView } from "@/components/entries-view";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toIsoDate, type EntryRecord, type SourceOption } from "@/lib/finance";

export const metadata = { title: "Ledger" };

// The list reads a mutable database, so it must render per request rather than
// being baked at build time.
export const dynamic = "force-dynamic";

export default async function EntriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [rows, sources] = await Promise.all([
    prisma.entry.findMany({
      where: { userId: user.id },
      orderBy: [{ occurredOn: "desc" }, { createdAt: "desc" }],
      select: {
        id: true,
        type: true,
        amountCents: true,
        occurredOn: true,
        category: true,
        note: true,
        sourceId: true,
        source: { select: { name: true } },
      },
    }),
    // Only active sources are offered for new income — an archived one is a
    // source you have stopped receiving from, and the drawer would otherwise
    // invite you to book fresh income against it.
    prisma.incomeSource.findMany({
      where: { userId: user.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
  ]);

  // Dates cross to the client as plain ISO date strings so formatting stays
  // deterministic and the payload stays serializable.
  const entries: EntryRecord[] = rows.map((row) => ({
    id: row.id,
    type: row.type,
    amountCents: row.amountCents,
    occurredOn: toIsoDate(row.occurredOn) ?? "",
    category: row.category,
    note: row.note,
    sourceId: row.sourceId,
    sourceName: row.source?.name ?? null,
  }));

  const options: SourceOption[] = sources;

  return <EntriesView entries={entries} sources={options} />;
}
