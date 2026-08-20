import { redirect } from "next/navigation";
import { EntriesView } from "@/components/entries-view";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toIsoDate, type EntryRecord, type SourceOption } from "@/lib/finance";
import type { CategoryOption } from "@/lib/expense";
import { ensureCategories, postDueRecurring } from "@/lib/expense-server";

export const metadata = { title: "Ledger" };

// The list reads a mutable database, so it must render per request rather than
// being baked at build time.
export const dynamic = "force-dynamic";

export default async function EntriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // There is no scheduler, so the ledger is where the app catches up on what
  // repeats. Done before the read, so anything posted appears in the same view
  // rather than only after a refresh.
  await ensureCategories(user.id);
  const postedCount = await postDueRecurring(user.id);

  const [rows, sources, categories] = await Promise.all([
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
        merchant: true,
        paymentMethod: true,
        categoryId: true,
        recurringId: true,
        source: { select: { name: true } },
        expenseCategory: { select: { name: true, tone: true } },
        // Metadata only — the bytes are served by /attachment/[id], never
        // shipped through this page's payload.
        attachments: {
          select: { id: true, mimeType: true, fileName: true, byteSize: true },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    // Only active sources and categories are offered for new entries: an
    // archived one is something you have stopped using, and the drawer would
    // otherwise invite you to book fresh activity against it.
    prisma.incomeSource.findMany({
      where: { userId: user.id, active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, kind: true },
    }),
    prisma.expenseCategory.findMany({
      where: { userId: user.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, tone: true },
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
    categoryId: row.categoryId,
    categoryName: row.expenseCategory?.name ?? null,
    categoryTone: row.expenseCategory?.tone ?? null,
    merchant: row.merchant,
    paymentMethod: row.paymentMethod,
    recurringId: row.recurringId,
    attachments: row.attachments,
  }));

  const sourceOptions: SourceOption[] = sources;
  const categoryOptions: CategoryOption[] = categories;

  return (
    <EntriesView
      entries={entries}
      sources={sourceOptions}
      categories={categoryOptions}
      postedCount={postedCount}
    />
  );
}
