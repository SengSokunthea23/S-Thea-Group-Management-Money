/**
 * Turns a raw `User-Agent` header into something a person can recognise on the
 * Devices screen — "Chrome on Windows" rather than eighty characters of
 * Mozilla-compatible archaeology.
 *
 * Deliberately small and dependency-free. A full UA database would be more
 * precise, but the only question this screen has to answer is "do I recognise
 * this, or should I cut it off?", and browser-plus-platform answers it.
 *
 * Nothing here is a security boundary: the header is attacker-controlled, so a
 * forged one produces a misleading label and nothing more. Sessions are
 * authenticated by the token hash alone.
 */

export type DeviceInfo = {
  /** "Chrome", or null when the string is unrecognisable. */
  browser: string | null;
  /** "Windows", or null. */
  platform: string | null;
  /** True for phones and tablets, which get a different icon. */
  mobile: boolean;
};

// Order matters: every Chromium browser also claims "Chrome", and Chrome itself
// claims "Safari". Most specific first, so the first hit wins.
const BROWSERS: [pattern: RegExp, name: string][] = [
  [/\bEdg(?:e|A|iOS)?\//, "Edge"],
  [/\bOPR\/|\bOpera\//, "Opera"],
  [/\bSamsungBrowser\//, "Samsung Internet"],
  [/\bVivaldi\//, "Vivaldi"],
  [/\bBrave\//, "Brave"],
  [/\bFirefox\/|\bFxiOS\//, "Firefox"],
  [/\bCriOS\//, "Chrome"],
  [/\bChrome\//, "Chrome"],
  [/\bSafari\//, "Safari"],
];

// Likewise: an Android UA also contains "Linux", and iPadOS claims "Mac OS X".
const PLATFORMS: [pattern: RegExp, name: string][] = [
  [/\bWindows NT\b/, "Windows"],
  [/\bAndroid\b/, "Android"],
  [/\b(?:iPhone|iPad|iPod)\b/, "iOS"],
  [/\bMac OS X\b|\bMacintosh\b/, "macOS"],
  [/\bCrOS\b/, "ChromeOS"],
  [/\bLinux\b/, "Linux"],
];

const MOBILE = /\bMobi|\bAndroid\b|\b(?:iPhone|iPad|iPod)\b|\bTablet\b/;

function firstMatch(
  candidates: [RegExp, string][],
  userAgent: string,
): string | null {
  for (const [pattern, name] of candidates) {
    if (pattern.test(userAgent)) return name;
  }
  return null;
}

export function parseUserAgent(userAgent: string | null): DeviceInfo {
  if (!userAgent) return { browser: null, platform: null, mobile: false };

  return {
    browser: firstMatch(BROWSERS, userAgent),
    platform: firstMatch(PLATFORMS, userAgent),
    mobile: MOBILE.test(userAgent),
  };
}

/**
 * A display label built from whatever could be identified. `unknownLabel` comes
 * from the caller so the fallback is translated along with everything else.
 */
export function describeDevice(
  userAgent: string | null,
  unknownLabel: string,
  joiner: string,
): string {
  const { browser, platform } = parseUserAgent(userAgent);

  if (browser && platform) return `${browser}${joiner}${platform}`;
  return browser ?? platform ?? unknownLabel;
}

/** Header values are untrusted; cap the length before it reaches the database. */
export const MAX_USER_AGENT_LENGTH = 400;
export const MAX_IP_LENGTH = 60;

export function truncate(value: string | null, max: number): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}
