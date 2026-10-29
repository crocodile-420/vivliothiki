// Locale-prefixed links: "/books" → "/el/books", "#faq" → "/el#faq", so home-page sections are reachable from any page.
export const localHref = (lang: string, href: string) => `/${lang}${href}`;
