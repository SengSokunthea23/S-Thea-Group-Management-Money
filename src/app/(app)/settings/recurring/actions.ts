"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";
import { parseRecurringInput, type RecurringFieldErrors } from "@/lib/finance";

export type RecurringActionState =
  | { ok: true }
  | { ok: false; fieldErrors: RecurringFieldErrors; formError?: string }
  | null;

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/settings/recurring");
}

async function ownsCategory(userId: string, categoryId: string) {
  const row = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  return row !== null;
}

export async function createRecurring(
  _prev: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseRecurringInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  if (!(await ownsCategory(user.id, parsed.data.categoryId))) {
    return {
      ok: false,
      fieldErrors: { categoryId: t("categories.errors.missing") },
    };
  }

  await prisma.recurringExpense.create({
    data: { ...parsed.data, userId: user.id },
  });

  revalidateAll();
  return { ok: true };
}

export async function updateRecurring(
  id: string,
  _prev: RecurringActionState,
  formData: FormData,
): Promise<RecurringActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseRecurringInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  if (!(await ownsCategory(user.id, parsed.data.categoryId))) {
    return {
      ok: false,
      fieldErrors: { categoryId: t("categories.errors.missing") },
    };
  }

  // `lastPostedMonth` is deliberately untouched. Editing the amount changes
  // what future months cost, not what already happened — rewinding it would
  // re-post months that are already in the ledger.
  const { count } = await prisma.recurringExpense.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });

  revalidateAll();

  if (count === 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("recurring.errors.deleteFailed"),
    };
  }

  return { ok: true };
}

export async function deleteRecurring(
  id: string,
): Promise<RecurringActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  // Entries already posted from this template keep their money and simply lose
  // the "Recurring" marker — see onDelete: SetNull on Entry.recurringId.
  // Deleting a template is a decision about the future, not the past.
  const { count } = await prisma.recurringExpense.deleteMany({
    where: { id, userId: user.id },
  });

  revalidateAll();

  if (count === 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("recurring.errors.deleteFailed"),
    };
  }

  return { ok: true };
}
