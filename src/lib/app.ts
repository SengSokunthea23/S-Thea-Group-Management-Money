/**
 * The product's name, in one place.
 *
 * It reaches the UI two ways, and both start here: the message catalogue picks
 * it up as `common.appName` (so a locale *could* transliterate it, though a
 * proper noun normally shouldn't), and the metadata title template in
 * src/app/layout.tsx appends it to every page title.
 */
export const APP_NAME = "S-Thea Group";

/** The letter in the square badge beside the wordmark. */
export const APP_INITIAL = APP_NAME.charAt(0);
