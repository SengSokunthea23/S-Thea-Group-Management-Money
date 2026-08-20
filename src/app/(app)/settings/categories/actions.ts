"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";
import { parseCategoryInput, type CategoryFieldErrors } from "@/lib/finance";

export type CategoryActionState =
  | { ok: true }
  | { ok: false; fieldErrors: CategoryFieldErrors; formError?: string }
  | null;

/**
 * Duck-typed rather than `instanceof PrismaClientKnownRequestError` so the check
 * survives the generated client being regenerated or swapped.
 */
function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/settings/categories");
  revalidatePath("/settings/recurring");
}

export async function createCategory(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseCategoryInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  // New categories sort to the end rather than jumping into the middle of a
  // list the user has already arranged in their head.
  const last = await prisma.expenseCategory.findFirst({
    where: { userId: user.id },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  try {
    await prisma.expenseCategory.create({
      data: {
        ...parsed.data,
        userId: user.id,
        sortOrder: (last?.sortOrder ?? -1) + 1,
      },
    });
  } catch (error) {
    // The unique index is on (userId, name), so this only fires for a clash
    // with one of this user's own categories.
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        fieldErrors: { name: t("categories.errors.nameTaken") },
      };
    }
    throw error;
  }

  revalidateAll();
  return { ok: true };
}

export async function updateCategory(
  id: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseCategoryInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    // Ownership is part of the filter, so another user's id simply matches
    // nothing rather than being updated.
    const { count } = await prisma.expenseCategory.updateMany({
      where: { id, userId: user.id },
      data: parsed.data,
    });

    if (count === 0) {
      revalidateAll();
      return {
        ok: false,
        fieldErrors: {},
        formError: t("categories.errors.missing"),
      };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        fieldErrors: { name: t("categories.errors.nameTaken") },
      };
    }
    throw error;
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteCategory(
  id: string,
): Promise<CategoryActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  // Deleting would detach its expenses (onDelete: SetNull), leaving spending
  // that belongs to nothing and silently distorting the breakdown. Refuse and
  // point at archiving, which is what the user almost always means.
  const used = await prisma.entry.count({
    where: { categoryId: id, userId: user.id },
  });
  if (used > 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("categories.errors.deleteHasEntries"),
    };
  }

  const { count } = await prisma.expenseCategory.deleteMany({
    where: { id, userId: user.id },
  });

  revalidateAll();

  if (count === 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("categories.errors.deleteFailed"),
    };
  }

  return { ok: true };
}
