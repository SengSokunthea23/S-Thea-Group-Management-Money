"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { PlannedCategory, PlannerBaseline } from "@/lib/planner";

/**
 * Starting figures for the planner, drawn from what actually happened.
 *
 * Read-only by construction: there is no write anywhere in this file, and the
 * planner never calls anything else. That is what makes it a place to think
 * rather than a place to break something — you can put any number into it and
 * the ledger behind it does not move.
 *
 * Fetched when the panel opens rather than with every page, because most page
 * loads never open it and this is three queries.
 */

/** Long enough to average out a lumpy month, short enough to still be you. */
const MONTHS_OBSERVED = 6;

export async function getPlannerBaseline(): Promise<PlannerBaseline | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const now = new Date();
  const since = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (MONTHS_OBSERVED - 1), 1),
  );

  const [income, saving, categories] = await Promise.all([
    prisma.entry.aggregate({
      where: { userId: user.id, type: "INCOME", occurredOn: { gte: since } },
      _sum: { amountCents: true },
    }),
    prisma.entry.aggregate({
      where: { userId: user.id, type: "SAVING", occurredOn: { gte: since } },
      _sum: { amountCents: true },
    }),
    prisma.expenseCategory.findMany({
      where: { userId: user.id, active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        tone: true,
        budgetCents: true,
        entries: {
          where: { occurredOn: { gte: since } },
          select: { amountCents: true },
        },
      },
    }),
  ]);

  /** Per month, so every figure in the panel is on the same footing. */
  const perMonth = (total: number) => Math.round(total / MONTHS_OBSERVED);

  const planned: PlannedCategory[] = categories.map((category) => {
    const spent = category.entries.reduce(
      (sum, entry) => sum + entry.amountCents,
      0,
    );

    return {
      id: category.id,
      name: category.name,
      tone: category.tone,
      // A budget, where one exists, is what the user *decided* this should
      // cost — a better starting point for a plan than what it happened to
      // cost. The average stands in when there is no budget.
      typicalCents: category.budgetCents ?? perMonth(spent),
      budgetCents: category.budgetCents,
    };
  });

  return {
    incomeCents: perMonth(income._sum.amountCents ?? 0),
    savingCents: perMonth(saving._sum.amountCents ?? 0),
    categories: planned,
    monthsObserved: MONTHS_OBSERVED,
  };
}
