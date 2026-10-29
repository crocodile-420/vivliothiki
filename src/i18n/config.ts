export const locales = ["el", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "el";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

// Languages a book can be written in. Greek first: it is the market Amazon KDP does not serve.
export const BOOK_LANGUAGES = ["el", "en", "de", "fr", "es", "it", "pl", "bg", "ro", "sq", "tr", "ar", "ru", "uk"] as const;

export const CATEGORIES = ["children", "fiction", "crime", "poetry", "nonfiction", "education", "other"] as const;
