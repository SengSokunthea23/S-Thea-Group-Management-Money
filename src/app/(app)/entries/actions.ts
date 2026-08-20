"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";
import { parseEntryInput, type EntryFieldErrors } from "@/lib/finance";

export type EntryActionState =
  | { ok: true }
  | { ok: false; fieldErrors: EntryFieldErrors; formError?: string }
  | null;

/**
 * Every action here re-derives the user from the session cookie and scopes its
 * `where` clause by that id. The row id alone is never enough — otherwise
 * knowing a cuid would be enough to read or edit somebody else's ledger.
 */
async function requireUser() {
  const user = await getCurrentUser();
  if (!user) return null;
  return user;
}

/** Both list pages and the dashboard read this data. */
function revalidateLedger() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/sources");
}

export async function createEntry(
  _prevState: EntryActionState,
  formData: FormData,
): Promise<EntryActionState> {
  const t = await getT();
  const user = await requireUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseEntryInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  // A source id arriving from the form is untrusted input: confirm it is one of
  // this user's own before writing a row that points at it.
  if (parsed.data.sourceId && !(await ownsSource(user.id, parsed.data.sourceId))) {
    return {
      ok: false,
      fieldErrors: { sourceId: t("entries.errors.sourceMissing") },
    };
  }

  await prisma.entry.create({ data: { ...parsed.data, userId: user.id } });

  revalidateLedger();
  return { ok: true };
}

export async function updateEntry(
  id: string,
  _prevState: EntryActionState,
  formData: FormData,
): Promise<EntryActionState> {
  const t = await getT();
  const user = await requireUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const parsed = parseEntryInput(formData, t);
  if (!parsed.ok) return { ok: false, fieldErrors: parsed.fieldErrors };

  if (parsed.data.sourceId && !(await ownsSource(user.id, parsed.data.sourceId))) {
    return {
      ok: false,
      fieldErrors: { sourceId: t("entries.errors.sourceMissing") },
    };
  }

  // updateMany rather than update: it takes a filter, so ownership is part of
  // the same statement instead of a separate read that could race.
  const { count } = await prisma.entry.updateMany({
    where: { id, userId: user.id },
    data: parsed.data,
  });

  if (count === 0) {
    revalidateLedger();
    return {
      ok: false,
      fieldErrors: {},
      formError: t("entries.errors.deleteFailed"),
    };
  }

  revalidateLedger();
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<EntryActionState> {
  const t = await getT();
  const user = await requireUser();
  if (!user) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("settings.errors.sessionExpired"),
    };
  }

  const { count } = await prisma.entry.deleteMany({
    where: { id, userId: user.id },
  });

  revalidateLedger();

  // Already gone, or removed in another tab — the list reconciles either way.
  if (count === 0) {
    return {
      ok: false,
      fieldErrors: {},
      formError: t("entries.errors.deleteFailed"),
    };
  }

  return { ok: true };
}

async function ownsSource(userId: string, sourceId: string): Promise<boolean> {
  const source = await prisma.incomeSource.findFirst({
    where: { id: sourceId, userId },
    select: { id: true },
  });
  return source !== null;
}
