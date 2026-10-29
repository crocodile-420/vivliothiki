import Link from "next/link";
import { BookCard } from "@/components/BookCard";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { publishedBooks } from "@/lib/catalog";

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  const books = await publishedBooks({ limit: 8 });
  return (
    <div className="space-y-16">
      <section className="py-10">
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{t.home.heroTitle}</h1>
        <p className="mt-4 max-w-2xl text-lg text-muted">{t.home.heroBody}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={`/${lang}/dashboard`} className="btn">
            {t.home.ctaPublish}
          </Link>
          <Link href={`/${lang}/books`} className="btn-ghost">
            {t.home.ctaBrowse}
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">{t.home.how}</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {t.home.steps.map(([title, body], i) => (
            <li key={title} className="panel">
              <div className="font-serif text-3xl text-accent">{i + 1}</div>
              <div className="mt-2 font-semibold">{title}</div>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {books.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold">{t.home.latest}</h2>
          <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {books.map((b) => (
              <BookCard key={b.id} book={b} lang={lang} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
