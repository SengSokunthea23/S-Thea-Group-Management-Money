import { DEFAULT_LOCALE, type Locale } from "./config";
import { en, type Dictionary } from "./dictionaries/en";
import { km } from "./dictionaries/km";

export type { Dictionary };

const DICTIONARIES: Record<Locale, Dictionary> = { en, km };

export function getDictionary(locale: Locale): Dictionary {
  return DICTIONARIES[locale] ?? DICTIONARIES[DEFAULT_LOCALE];
}

/** A count-sensitive message. Khmer fills both forms identically. */
type Plural = { one: string; other: string };

/**
 * Every addressable message path in the catalogue, as a dotted string —
 * "contacts.errors.emailTaken". A `{ one, other }` node is a leaf, not a branch,
 * so `t("contacts.count", { count })` type-checks and `t("contacts.count.one")`
 * does not.
 */
type Paths<T> = {
  [K in keyof T & string]: T[K] extends Plural
    ? K
    : T[K] extends string
      ? K
      : `${K}.${Paths<T[K]>}`;
}[keyof T & string];

export type MessageKey = Paths<Dictionary>;

export type Vars = Record<string, string | number>;

export type Translator = (key: MessageKey, vars?: Vars) => string;

function lookup(dictionary: Dictionary, key: string): unknown {
  let node: unknown = dictionary;

  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[part];
  }

  return node;
}

function isPlural(value: unknown): value is Plural {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as Plural).one === "string" &&
    typeof (value as Plural).other === "string"
  );
}

/** Replaces `{name}` with the matching var; an unknown name is left in place. */
function interpolate(template: string, vars: Vars | undefined): string {
  if (!vars) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

/**
 * Builds the `t` used everywhere. Falls back to English for a key the active
 * dictionary somehow lacks, and to the key itself if English lacks it too — a
 * visible breadcrumb beats a blank label.
 */
export function createTranslator(locale: Locale): Translator {
  const dictionary = getDictionary(locale);

  return function t(key, vars) {
    const value = lookup(dictionary, key) ?? lookup(en, key);

    if (isPlural(value)) {
      // English is the only locale here with a real plural rule; Khmer defines
      // both forms identically, so the same branch serves both.
      const form = Number(vars?.count) === 1 ? value.one : value.other;
      return interpolate(form, vars);
    }

    if (typeof value === "string") return interpolate(value, vars);

    return key;
  };
}
