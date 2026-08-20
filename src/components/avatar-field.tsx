"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/components/i18n-provider";
import {
  AVATAR_ACCEPT,
  AVATAR_SIZE,
  ACCEPTED_AVATAR_TYPES,
  initialsOf,
} from "@/lib/avatar";

/**
 * Picks and previews a profile picture, and hands the form a downscaled copy.
 *
 * The chosen file is never submitted as-is. A phone camera produces several
 * megabytes at 4000px, which would blow past the server action body limit for
 * an image that is displayed at 32px. Cropping to a square and re-encoding at
 * 256px happens here, in the browser, so what crosses the wire is a few tens of
 * kilobytes and the server's size check is a backstop rather than a wall people
 * keep walking into.
 */
export function AvatarField({
  fieldName,
  removeFieldName,
  userName,
  currentUrl,
}: {
  /** Form field name carrying the resized file. */
  fieldName: string;
  /** Form field name for the hidden "clear it" flag. */
  removeFieldName: string;
  /** Used for the initials placeholder when there is no picture. */
  userName: string;
  /** Existing picture, or null when the user has none yet. */
  currentUrl: string | null;
}) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [preview, setPreview] = useState<string | null>(currentUrl);
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Object URLs are a manual allocation; without this the page leaks one per
  // picture the user auditions before settling on one.
  const objectUrlRef = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    },
    [],
  );

  function showPreview(blob: Blob) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(blob);
    objectUrlRef.current = url;
    setPreview(url);
  }

  async function onPick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setBusy(true);

    try {
      if (!ACCEPTED_AVATAR_TYPES.includes(file.type as never)) {
        setError(t("settings.errors.avatarType"));
        return;
      }

      const resized = await squareResize(file, AVATAR_SIZE);

      // A DataTransfer is the only way to put a generated File into a real
      // <input type="file">, which is what keeps this a plain form submission
      // instead of a bespoke fetch.
      const transfer = new DataTransfer();
      transfer.items.add(
        new File([resized], "avatar.jpg", { type: "image/jpeg" }),
      );
      if (fileRef.current) fileRef.current.files = transfer.files;

      showPreview(resized);
      setRemove(false);
    } catch {
      setError(t("settings.errors.avatarUnreadable"));
    } finally {
      setBusy(false);
      // Clear the picker so choosing the same file twice still fires onChange.
      event.target.value = "";
    }
  }

  function onRemove() {
    setError(null);
    setRemove(true);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">
        {t("settings.fieldPhoto")}
      </span>

      <div className="flex items-center gap-4">
        {preview ? (
          /* A blob: URL for a file that has not been uploaded yet, which
             next/image can neither fetch nor optimise. */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={preview}
            alt=""
            width={64}
            height={64}
            className="size-16 shrink-0 rounded-full object-cover"
          />
        ) : (
          <span
            aria-hidden="true"
            className="flex size-16 shrink-0 items-center justify-center rounded-full bg-avatar text-lg font-semibold text-avatar-fg"
          >
            {initialsOf(userName)}
          </span>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-hover disabled:opacity-60"
          >
            {busy ? t("common.saving") : t("settings.choosePhoto")}
          </button>

          {preview ? (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-muted transition-colors hover:bg-danger-surface hover:text-danger-text"
            >
              {t("settings.removePhoto")}
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-muted">{t("settings.photoHint")}</p>
      {error ? <p className="text-sm text-danger-text">{error}</p> : null}

      {/* The visible button drives this; it stays in the DOM so the resized
          file is submitted with the rest of the form. */}
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_ACCEPT}
        onChange={onPick}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input
        ref={fileRef}
        type="file"
        name={fieldName}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      />
      <input type="hidden" name={removeFieldName} value={remove ? "1" : ""} />
    </div>
  );
}

/**
 * Centre-crops to a square and re-encodes as JPEG at `size` px.
 *
 * `createImageBitmap` decodes off the main thread and, importantly, honours EXIF
 * orientation — without that, portrait photos from a phone arrive on their side.
 */
async function squareResize(file: File, size: number): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });

  try {
    const edge = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - edge) / 2;
    const sy = (bitmap.height - edge) / 2;

    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("2d context unavailable");

    context.drawImage(bitmap, sx, sy, edge, edge, 0, 0, size, size);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) throw new Error("encode failed");

    return blob;
  } finally {
    bitmap.close();
  }
}
