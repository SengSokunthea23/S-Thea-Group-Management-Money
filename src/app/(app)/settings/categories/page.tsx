import { redirect } from "next/navigation";
import { CategoriesView } from "@/components/categories-view";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ensureCategories } from "@/lib/expense-server";
import type { CategoryRecord } from "@/lib/expense";

export const metadata = { title: "Categories" };

export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await ensureCategories(user.id);

  // The budget meters are a month-to-date figure, so the spend total is scoped
  // to the current month rather than all time.
  const now = new Date();
  const monthStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  );

  const rows = await prisma.expenseCategory.findMany({
    where: { userId: user.id },
    // Active first, then the user's own order: archived categories are history,
    // and history belongs at the bottom.
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      budgetCents: true,
      tone: true,
      active: true,
      sortOrder: true,
      _count: { select: { entries: true } },
      entries: {
        where: { occurredOn: { gte: monthStart } },
        select: { amountCents: true },
      },
    },
  });

  const categories: CategoryRecord[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    budgetCents: row.budgetCents,
    tone: row.tone,
    active: row.active,
    sortOrder: row.sortOrder,
    spentCents: row.entries.reduce((sum, entry) => sum + entry.amountCents, 0),
    entryCount: row._count.entries,
  }));

  return <CategoriesView categories={categories} />;
}
