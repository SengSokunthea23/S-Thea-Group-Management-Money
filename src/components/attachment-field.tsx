"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import {
  ATTACHMENT_ACCEPT,
  MAX_ATTACHMENTS_PER_ENTRY,
  MAX_PDF_BYTES,
  RECEIPT_MAX_EDGE,
  formatBytes,
  isImageType,
  attachmentUrl,
  type AttachmentType,
} from "@/lib/attachment";
import type { AttachmentRecord } from "@/lib/expense";

type Pending = {
  /** Stable key for React; the file itself has no id until it is saved. */
  key: string;
  file: File;
  previewUrl: string | null;
};

/**
 * Receipts and invoices on an expense.
 *
 * Photographs are cropped down to a sane edge and re-encoded here, in the
 * browser, before they are ever submitted: a phone camera produces four
 * megabytes of a slip that only needs to be legible, and a form carrying six of
 * those would exceed the server action body limit. PDFs pass through untouched
 * — re-encoding one through a canvas would turn selectable text into pixels.
 */
export function AttachmentField({
  existing,
  fieldName,
  removeFieldName,
}: {
  /** Already-saved receipts, when editing. */
  existing: AttachmentRecord[];
  fieldName: string;
  removeFieldName: string;
}) {
  const t = useT();
  const pickerRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const [pending, setPending] = useState<Pending[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Object URLs are a manual allocation; without this the page leaks one per
  // receipt the user auditions.
  const urlsRef = useRef<string[]>([]);
  useEffect(
    () => () => {
      for (const url of urlsRef.current) URL.revokeObjectURL(url);
    },
    [],
  );

  const kept = existing.filter((item) => !removed.includes(item.id));
  const total = kept.length + pending.length;
  const full = total >= MAX_ATTACHMENTS_PER_ENTRY;

  /** Mirrors `pending` into the real file input that the form submits. */
  function syncFiles(next: Pending[]) {
    const transfer = new DataTransfer();
    for (const item of next) transfer.items.add(item.file);
    if (filesRef.current) filesRef.current.files = transfer.files;
    setPending(next);
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const chosen = [...(event.target.files ?? [])];
    event.target.value = "";
    if (chosen.length === 0) return;

    setError(null);
    setBusy(true);

    try {
      const room = MAX_ATTACHMENTS_PER_ENTRY - total;
      if (chosen.length > room) {
        setError(
          t("entries.errors.attachmentTooMany", {
            count: MAX_ATTACHMENTS_PER_ENTRY,
          }),
        );
        return;
      }

      const added: Pending[] = [];

      for (const file of chosen) {
        const type = file.type as AttachmentType;

        if (isImageType(type)) {
          const shrunk = await shrinkImage(file, RECEIPT_MAX_EDGE);
          const url = URL.createObjectURL(shrunk);
          urlsRef.current.push(url);
          added.push({
            key: `${file.name}-${crypto.randomUUID()}`,
            file: new File([shrunk], renameToJpeg(file.name), {
              type: "image/jpeg",
            }),
            previewUrl: url,
          });
        } else if (type === "application/pdf") {
          if (file.size > MAX_PDF_BYTES) {
            setError(t("entries.errors.attachmentTooLarge"));
            return;
          }
          added.push({
            key: `${file.name}-${crypto.randomUUID()}`,
            file,
            previewUrl: null,
          });
        } else {
          setError(t("entries.errors.attachmentType"));
          return;
        }
      }

      syncFiles([...pending, ...added]);
    } catch {
      setError(t("entries.errors.attachmentFailed"));
    } finally {
      setBusy(false);
    }
  }

  function dropPending(key: string) {
    syncFiles(pending.filter((item) => item.key !== key));
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">
        {t("entries.fieldReceipts")}
      </span>

      {kept.length > 0 || pending.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {kept.map((item) => (
            <li key={item.id}>
              <Tile
                href={attachmentUrl(item.id)}
                previewUrl={
                  isImageType(item.mimeType) ? attachmentUrl(item.id) : null
                }
                caption={item.fileName ?? formatBytes(item.byteSize)}
                onRemove={() => setRemoved((ids) => [...ids, item.id])}
                removeLabel={t("entries.removeReceipt")}
                openLabel={t("entries.openReceipt")}
              />
            </li>
          ))}
          {pending.map((item) => (
            <li key={item.key}>
              <Tile
                href={item.previewUrl}
                previewUrl={item.previewUrl}
                caption={item.file.name}
                onRemove={() => dropPending(item.key)}
                removeLabel={t("entries.removeReceipt")}
                openLabel={t("entries.openReceipt")}
              />
            </li>
          ))}
        </ul>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => pickerRef.current?.click()}
          disabled={busy || full}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-hover disabled:opacity-60"
        >
          {busy ? t("common.saving") : t("entries.addReceipt")}
        </button>
        <span className="text-xs text-muted">
          {t("entries.receiptsHint", { count: MAX_ATTACHMENTS_PER_ENTRY })}
        </span>
      </div>

      {error ? <p className="text-sm text-danger-text">{error}</p> : null}

      {/* The visible button drives this one; the second input is what the form
          actually submits, holding the resized copies. */}
      <input
        ref={pickerRef}
        type="file"
        accept={ATTACHMENT_ACCEPT}
        multiple
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={filesRef}
        type="file"
        name={fieldName}
        multiple
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input type="hidden" name={removeFieldName} value={removed.join(",")} />
    </div>
  );
}

function Tile({
  href,
  previewUrl,
  caption,
  onRemove,
  removeLabel,
  openLabel,
}: {
  href: string | null;
  previewUrl: string | null;
  caption: string;
  onRemove: () => void;
  removeLabel: string;
  openLabel: string;
}) {
  return (
    <div className="group relative">
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          title={`${openLabel}: ${caption}`}
          className="block size-20 overflow-hidden rounded-md border border-border bg-sunken"
        >
          <Preview previewUrl={previewUrl} caption={caption} />
        </a>
      ) : (
        <span className="block size-20 overflow-hidden rounded-md border border-border bg-sunken">
          <Preview previewUrl={previewUrl} caption={caption} />
        </span>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label={`${removeLabel}: ${caption}`}
        className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-surface text-muted shadow-sm transition-colors hover:bg-danger hover:text-danger-fg"
      >
        <svg
          className="size-3"
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="m5.5 5.5 9 9m0-9-9 9" />
        </svg>
      </button>
    </div>
  );
}

function Preview({
  previewUrl,
  caption,
}: {
  previewUrl: string | null;
  caption: string;
}) {
  if (previewUrl) {
    return (
      /* A receipt thumbnail: already downscaled by us, or a local blob: URL for
         a file that has not been uploaded yet. Neither is something next/image
         can improve on. */
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt=""
        className="size-full object-cover"
        loading="lazy"
      />
    );
  }

  return (
    <span className="flex size-full flex-col items-center justify-center gap-1 px-1 text-center">
      <svg
        className="size-5 text-muted"
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M11.5 2.5H6a1.5 1.5 0 0 0-1.5 1.5v12A1.5 1.5 0 0 0 6 17.5h8a1.5 1.5 0 0 0 1.5-1.5V6.5Z" />
        <path d="M11.5 2.5v4h4" />
      </svg>
      <span className="line-clamp-2 text-[10px] leading-tight text-muted">
        {caption}
      </span>
    </span>
  );
}

function renameToJpeg(name: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "receipt"}.jpg`;
}

/**
 * Fits the image inside `maxEdge` and re-encodes as JPEG.
 *
 * Unlike an avatar this is not cropped square — a receipt is tall and cropping
 * it would cut off the total. `createImageBitmap` also honours EXIF
 * orientation, without which a photo taken in portrait arrives on its side.
 */
async function shrinkImage(file: File, maxEdge: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("2d context unavailable");

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob) throw new Error("encode failed");

    return blob;
  } finally {
    bitmap.close();
  }
}
