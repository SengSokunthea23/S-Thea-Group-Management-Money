import "server-only";

import { prisma } from "@/lib/prisma";
import { getT } from "@/lib/preferences";
import {
  DEFAULT_EXPENSE_CATEGORIES,
  clampDayToMonth,
  monthKeyOf,
} from "@/lib/expense";

/**
 * Server-side expense plumbing: giving a new account something to start from,
 * and posting the expenses that repeat.
 */

/**
 * Ensures the account has categories, creating the starting set on first use.
 *
 * Lazy rather than done at sign-up, because accounts predate this feature and a
 * migration that invents rows is harder to reason about than one that doesn't.
 * `createMany` with `skipDuplicates` leans on the (userId, name) unique index,
 * so two tabs racing on a first load cannot produce a doubled list.
 *
 * Names come from the catalogue, so a Khmer user starts with Khmer categories —
 * and because they are ordinary rows from that moment on, renaming one later
 * simply keeps whatever the user typed.
 */
export async function ensureCategories(userId: string): Promise<void> {
  const existing = await prisma.expenseCategory.count({ where: { userId } });
  if (existing > 0) return;

  const t = await getT();

  await prisma.expenseCategory.createMany({
    data: DEFAULT_EXPENSE_CATEGORIES.map((category, index) => ({
      userId,
      name: t(`entries.expenseCategory.${category.key as "OTHER"}`),
      tone: category.tone,
      sortOrder: index,
    })),
  });
}

/**
 * Posts any recurring expense whose month has come and gone unposted.
 *
 * There is no scheduler in this app, so the catch-up runs when the ledger is
 * read. That is late but never wrong: `lastPostedMonth` advances one month at a
 * time, so an account left alone for a quarter gets three entries on its next
 * visit rather than one, and a template can never post the same month twice.
 *
 * Returns how many entries were written, so a caller can mention it.
 */
export async function postDueRecurring(
  userId: string,
  now: Date = new Date(),
): Promise<number> {
  const templates = await prisma.recurringExpense.findMany({
    where: { userId, active: true },
    select: {
      id: true,
      amountCents: true,
      dayOfMonth: true,
      merchant: true,
      paymentMethod: true,
      note: true,
      startsOn: true,
      lastPostedMonth: true,
      categoryId: true,
    },
  });

  if (templates.length === 0) return 0;

  const currentKey = monthKeyOf(now);
  let written = 0;

  for (const template of templates) {
    // Walk from the month after the last post — or from the start date — up to
    // and including the current month.
    let cursor = template.lastPostedMonth
      ? nextMonth(template.lastPostedMonth)
      : new Date(
          Date.UTC(
            template.startsOn.getUTCFullYear(),
            template.startsOn.getUTCMonth(),
            1,
          ),
        );

    // A stuck template would otherwise spin forever if a key were malformed.
    let guard = 0;

    while (monthKeyOf(cursor) <= currentKey && guard < 60) {
      guard += 1;

      const occurredOn = clampDayToMonth(
        cursor.getUTCFullYear(),
        cursor.getUTCMonth(),
        template.dayOfMonth,
      );

      // Only post a day that has actually arrived. Without this, a template due
      // on the 28th would be booked on the 1st, and every month-to-date figure
      // would count money not yet spent.
      if (occurredOn > now) break;

      const key = monthKeyOf(cursor);

      // The filter carries the expected `lastPostedMonth`, so two concurrent
      // readers cannot both claim the same month: the second matches nothing.
      const claimed = await prisma.recurringExpense.updateMany({
        where: {
          id: template.id,
          lastPostedMonth: template.lastPostedMonth,
        },
        data: { lastPostedMonth: key },
      });
      if (claimed.count === 0) break;

      await prisma.entry.create({
        data: {
          userId,
          type: "EXPENSE",
          amountCents: template.amountCents,
          occurredOn,
          categoryId: template.categoryId,
          merchant: template.merchant,
          paymentMethod: template.paymentMethod,
          note: template.note,
          recurringId: template.id,
        },
      });

      written += 1;
      template.lastPostedMonth = key;
      cursor = nextMonth(key);
    }
  }

  return written;
}

/** "2026-08" → the first of 2026-09, in UTC. */
function nextMonth(key: string): Date {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month, 1));
}
