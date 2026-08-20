// Whether the desktop sidebar is showing labels or just icons.
//
// A cookie rather than localStorage, for the same reason as the theme: the
// server renders the rail at its chosen width on the first paint, so the layout
// never flashes wide and then snaps narrow.
//
// Desktop only. The mobile drawer is always full width — it is summoned
// deliberately and dismissed immediately, so there is no space to reclaim.

export const NAV_COOKIE = "crm_nav";

export const NAV_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export type NavState = "expanded" | "collapsed";

export const DEFAULT_NAV_STATE: NavState = "expanded";

export function isNavState(value: unknown): value is NavState {
  return value === "expanded" || value === "collapsed";
}

export function toNavState(value: string | undefined | null): NavState {
  return isNavState(value) ? value : DEFAULT_NAV_STATE;
}
