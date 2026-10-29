import type { Locale } from "./config";
import el, { type Dictionary } from "./el";
import en from "./en";

const dictionaries: Record<Locale, Dictionary> = { el, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
