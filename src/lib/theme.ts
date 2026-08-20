// Colour scheme preference. Stored in a plain (non-httpOnly) cookie so the
// switcher can flip `data-theme` on <html> the instant it is clicked, while the
// server still renders the right value on the next request — no flash, no
// blocking inline script.

export const THEMES = ["light", "dark", "system"] as const;

export type Theme = (typeof THEMES)[number];

export const THEME_COOKIE = "crm_theme";

/** "system" is the default: follow the OS until the user says otherwise. */
export const DEFAULT_THEME: Theme = "system";

// One year. Long enough that a preference set once effectively sticks.
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: unknown): value is Theme {
  return THEMES.includes(value as Theme);
}

export function toTheme(value: string | undefined | null): Theme {
  return isTheme(value) ? value : DEFAULT_THEME;
}
