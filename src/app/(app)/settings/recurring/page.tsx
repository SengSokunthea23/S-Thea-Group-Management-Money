import { redirect } from "next/navigation";
import { RecurringView } from "@/components/recurring-view";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toIsoDate } from "@/lib/finance";
import { ensureCategories } from "@/lib/expense-server";
import type { CategoryOption, RecurringRecord } from "@/lib/expense";

export const metadata = { title: "Recurring" };

export const dynamic = "force-dynamic";

export default async function RecurringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  await ensureCategories(user.id);

  const [rows, categories] = await Promise.all([
    prisma.recurringExpense.findMany({
      where: { userId: user.id },
      // Active first: a paused template is a decision already taken.
      orderBy: [{ active: "desc" }, { dayOfMonth: "asc" }],
      select: {
        id: true,
        amountCents: true,
        dayOfMonth: true,
        merchant: true,
        paymentMethod: true,
        note: true,
        active: true,
        startsOn: true,
        lastPostedMonth: true,
        categoryId: true,
        category: { select: { name: true, tone: true } },
      },
    }),
    prisma.expenseCategory.findMany({
      where: { userId: user.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, tone: true },
    }),
  ]);

  const templates: RecurringRecord[] = rows.map((row) => ({
    id: row.id,
    amountCents: row.amountCents,
    dayOfMonth: row.dayOfMonth,
    merchant: row.merchant,
    paymentMethod: row.paymentMethod,
    note: row.note,
    active: row.active,
    startsOn: toIsoDate(row.startsOn) ?? "",
    lastPostedMonth: row.lastPostedMonth,
    categoryId: row.categoryId,
    categoryName: row.category?.name ?? null,
    categoryTone: row.category?.tone ?? null,
  }));

  const options: CategoryOption[] = categories;

  return <RecurringView templates={templates} categories={options} />;
}
