"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { getT } from "@/lib/preferences";
import { parseEntryInput, type EntryFieldErrors } from "@/lib/finance";
import {
  MAX_ATTACHMENTS_PER_ENTRY,
  maxBytesFor,
  safeFileName,
  sniffAttachmentType,
} from "@/lib/attachment";
import type { Translator } from "@/lib/i18n/translate";

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
  return getCurrentUser();
}

/** Both list pages and the dashboard read this data. */
function revalidateLedger() {
  revalidatePath("/");
  revalidatePath("/entries");
  revalidatePath("/sources");
  revalidatePath("/settings/categories");
}

/** A source id from the form is untrusted until it is shown to be this user's. */
async function ownsSource(userId: string, sourceId: string): Promise<boolean> {
  const row = await prisma.incomeSource.findFirst({
    where: { id: sourceId, userId },
    select: { id: true },
  });
  return row !== null;
}

async function ownsCategory(userId: string, categoryId: string): Promise<boolean> {
  const row = await prisma.expenseCategory.findFirst({
    where: { id: categoryId, userId },
    select: { id: true },
  });
  return row !== null;
}

type PreparedAttachment = {
  data: Uint8Array<ArrayBuffer>;
  mimeType: string;
  fileName: string | null;
  byteSize: number;
};

/**
 * Reads the uploaded receipts.
 *
 * Photographs are downscaled in the browser before they get here, so the size
 * caps are a backstop for a request that skipped the form. The format is
 * decided by sniffing each file's leading bytes rather than by the `type` the
 * client reports — those bytes are later served back under a Content-Type we
 * choose, and taking the claim at face value would let someone store one thing
 * and have it served as another.
 */
async function prepareAttachments(
  formData: FormData,
  t: Translator,
  existingCount: number,
): Promise<
  { ok: true; files: PreparedAttachment[] } | { ok: false; error: string }
> {
  const uploads = formData
    .getAll("attachments")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (uploads.length === 0) return { ok: true, files: [] };

  if (existingCount + uploads.length > MAX_ATTACHMENTS_PER_ENTRY) {
    return {
      ok: false,
      error: t("entries.errors.attachmentTooMany", {
        count: MAX_ATTACHMENTS_PER_ENTRY,
      }),
    };
  }

  const files: PreparedAttachment[] = [];

  for (const upload of uploads) {
    const data = new Uint8Array(await upload.arrayBuffer());
    const mimeType = sniffAttachmentType(data);

    if (!mimeType) return { ok: false, error: t("entries.errors.attachmentType") };
    if (data.byteLength > maxBytesFor(mimeType)) {
      return { ok: false, error: t("entries.errors.attachmentTooLarge") };
    }

    files.push({
      data,
      mimeType,
      fileName: safeFileName(upload.name),
      byteSize: data.byteLength,
    });
  }

  return { ok: true, files };
}

/** Ids of receipts the form asked to drop, as sent by the hidden field. */
function removedAttachmentIds(formData: FormData): string[] {
  return formData
    .getAll("removeAttachments")
    .flatMap((value) => (typeof value === "string" ? value.split(",") : []))
    .map((id) => id.trim())
    .filter(Boolean);
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

  if (parsed.data.sourceId && !(await ownsSource(user.id, parsed.data.sourceId))) {
    return {
      ok: false,
      fieldErrors: { sourceId: t("entries.errors.sourceMissing") },
    };
  }
  if (
    parsed.data.categoryId &&
    !(await ownsCategory(user.id, parsed.data.categoryId))
  ) {
    return {
      ok: false,
      fieldErrors: { categoryId: t("categories.errors.missing") },
    };
  }

  const receipts = await prepareAttachments(formData, t, 0);
  if (!receipts.ok) {
    return { ok: false, fieldErrors: { attachments: receipts.error } };
  }

  await prisma.entry.create({
    data: {
      ...parsed.data,
      userId: user.id,
      attachments: {
        create: receipts.files.map((file) => ({ ...file, userId: user.id })),
      },
    },
  });

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
  if (
    parsed.data.categoryId &&
    !(await ownsCategory(user.id, parsed.data.categoryId))
  ) {
    return {
      ok: false,
      fieldErrors: { categoryId: t("categories.errors.missing") },
    };
  }

  const removing = removedAttachmentIds(formData);
  const kept = await prisma.attachment.count({
    where: { entryId: id, userId: user.id, id: { notIn: removing } },
  });

  const receipts = await prepareAttachments(formData, t, kept);
  if (!receipts.ok) {
    return { ok: false, fieldErrors: { attachments: receipts.error } };
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

  if (removing.length > 0) {
    // Scoped by userId as well as entryId: an id from the form is untrusted.
    await prisma.attachment.deleteMany({
      where: { id: { in: removing }, entryId: id, userId: user.id },
    });
  }

  if (receipts.files.length > 0) {
    await prisma.attachment.createMany({
      data: receipts.files.map((file) => ({
        ...file,
        entryId: id,
        userId: user.id,
      })),
    });
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

  // Attachments cascade with the entry — see the relation in the schema.
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
