"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";
import { parseSourceInput, type SourceFieldErrors } from "@/lib/finance";

export type SourceActionState =
  | { ok: true }
  | { ok: false; fieldErrors: SourceFieldErrors; formError?: string }
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

function revalidateLedger() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/sources");
}

export async function createSource(
  _prevState: SourceActionState,
  formData: FormData,
): Promise<SourceActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseSourceInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    await prisma.incomeSource.create({
      data: { ...parsed.data, userId: user.id },
    });
  } catch (error) {
    // The unique index is on (userId, name), so this only ever fires for a
    // clash with one of this user's own sources.
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        fieldErrors: { name: t("sources.errors.nameTaken") },
      };
    }
    throw error;
  }

  revalidateLedger();
  return { ok: true };
}

export async function updateSource(
  id: string,
  _prevState: SourceActionState,
  formData: FormData,
): Promise<SourceActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseSourceInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  try {
    // Ownership is part of the filter, so another user's id simply matches
    // nothing rather than being updated.
    const { count } = await prisma.incomeSource.updateMany({
      where: { id, userId: user.id },
      data: parsed.data,
    });

    if (count === 0) {
      revalidateLedger();
      return {
        ok: false,
        fieldErrors: {},
        formError: t("sources.errors.deleteFailed"),
      };
    }
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return {
        ok: false,
        fieldErrors: { name: t("sources.errors.nameTaken") },
      };
    }
    throw error;
  }

  revalidateLedger();
  return { ok: true };
}

export async function deleteSource(id: string): Promise<SourceActionState> {
  const t = await getT();
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  // Deleting a source would detach its entries (onDelete: SetNull), leaving
  // income that came from nowhere and silently distorting the breakdown. Refuse,
  // and point at archiving — which is what the user almost always means.
  const used = await prisma.entry.count({ where: { sourceId: id, userId: user.id } });
  if (used > 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("sources.errors.deleteHasEntries"),
    };
  }

  const { count } = await prisma.incomeSource.deleteMany({
    where: { id, userId: user.id },
  });

  revalidateLedger();

  if (count === 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("sources.errors.deleteFailed"),
    };
  }

  return { ok: true };
}
