import { BookCard } from "@/components/BookCard";
import { BOOK_LANGUAGES, CATEGORIES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { publishedBooks } from "@/lib/catalog";

export default async function Catalog({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ language?: string; category?: string }>;
}) {
  const { lang } = await params;
  const { language, category } = await searchParams;
  const t = getDictionary(lang);
  const books = await publishedBooks({ language: language || undefined, category: category || undefined });
  return (
    <div>
      <h1 className="text-3xl font-bold">{t.catalog.title}</h1>
      <form className="mt-6 flex flex-wrap items-end gap-3">
        <select name="language" defaultValue={language ?? ""} className="field w-auto">
          <option value="">{t.catalog.allLanguages}</option>
          {BOOK_LANGUAGES.map((l) => (
            <option key={l} value={l}>
              {t.languages[l]}
            </option>
          ))}
        </select>
        <select name="category" defaultValue={category ?? ""} className="field w-auto">
          <option value="">{t.catalog.allCategories}</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {t.categories[c]}
            </option>
          ))}
        </select>
        <button className="btn-ghost">{t.catalog.filter}</button>
      </form>
      {books.length === 0 ? (
        <p className="mt-10 text-muted">{t.catalog.empty}</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {books.map((b) => (
            <BookCard key={b.id} book={b} lang={lang} />
          ))}
        </div>
      )}
    </div>
  );
}
