// Single source of truth for date display and entry.
//
// The app follows the Cambodian convention: dd/mm/yyyy (e.g. 18/02/2025).
// Locale and time zone are pinned so the server and the browser can never
// disagree, and so the format doesn't drift with whatever locale the viewer's
// machine happens to have.

export const DATE_PLACEHOLDER = "dd/mm/yyyy";
export const EMPTY_DATE = "—";

const DISPLAY = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: Date | null | undefined): string {
  if (!date) return EMPTY_DATE;
  return DISPLAY.format(date);
}

/** Formats a stored ISO date ("YYYY-MM-DD") for display. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return EMPTY_DATE;
  return DISPLAY.format(toUtcDate(iso));
}

/** Date-only values live at UTC midnight so no time zone can shift the day. */
export function toUtcDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

export function toIsoDate(date: Date | null): string | null {
  return date ? date.toISOString().slice(0, 10) : null;
}

function buildIso(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(Date.UTC(year, month - 1, day));
  // Round-trip check rejects impossible days like 31/02 — Date would silently
  // roll those forward into the next month.
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** "18/02/2025" → "2025-02-18". Null when it isn't a real calendar date. */
export function parseDayFirst(input: string): string | null {
  const match = /^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/.exec(input.trim());
  if (!match) return null;

  return buildIso(Number(match[3]), Number(match[2]), Number(match[1]));
}

/**
 * Accepts what a user types (dd/mm/yyyy) and also raw ISO, so a value coming
 * from a native date control or an older record still parses.
 */
export function parseDateInput(input: string): string | null {
  const trimmed = input.trim();

  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) return buildIso(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  return parseDayFirst(trimmed);
}
