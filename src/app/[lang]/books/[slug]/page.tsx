import Link from "next/link";
import { notFound } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { coverUrl } from "@/lib/books";
import { bookBySlug } from "@/lib/catalog";
import { channel } from "@/lib/channels";
import { formatPrice } from "@/lib/pricing";

const FORMAT_ORDER = { paperback: 0, hardcover: 1, ebook: 2 } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const book = await bookBySlug(slug);
  return { title: book?.title };
}

export default async function BookPage({ params }: { params: Promise<{ lang: Locale; slug: string }> }) {
  const { lang, slug } = await params;
  const t = getDictionary(lang);
  const book = await bookBySlug(slug);
  if (!book) notFound();
  const cover = coverUrl(book.cover_image_path);
  const editions = [...book.editions].sort((a, b) => FORMAT_ORDER[a.format] - FORMAT_ORDER[b.format]);
  const priceLocale = lang === "el" ? "el-GR" : "en-IE";
  // Live listings in other stores, for readers who'd rather buy there.
  const elsewhere = (book.book_channels ?? []).flatMap((r) => {
    const c = channel(r.channel);
    return c && r.status === "listed" && r.listing_url ? [{ name: c.name, url: r.listing_url }] : [];
  });

  return (
    <div className="grid gap-10 md:grid-cols-[minmax(0,320px)_1fr]">
      <div className="aspect-[3/4] overflow-hidden rounded-md border border-line bg-card">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt={book.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center font-serif text-2xl">{book.title}</div>
        )}
      </div>
      <div>
        <h1 className="text-3xl font-bold leading-tight">{book.title}</h1>
        {book.subtitle && <p className="mt-1 text-lg text-muted">{book.subtitle}</p>}
        {book.author && (
          <p className="mt-3">
            {t.book.by}{" "}
            {book.author.handle ? (
              <Link href={`/${lang}/authors/${book.author.handle}`} className="underline">
                {book.author.display_name}
              </Link>
            ) : (
              book.author.display_name
            )}
          </p>
        )}
        <p className="mt-1 text-sm text-muted">
          {t.book.language}: {t.languages[book.language]} · {t.categories[book.category]}
        </p>
        <div className="mt-6 whitespace-pre-line leading-relaxed">{book.description}</div>

        <h2 className="mt-10 text-xl font-bold">{t.book.formats}</h2>
        <div className="mt-4 space-y-3">
          {editions.map((e) => (
            <form key={e.id} action="/api/checkout" method="post" className="panel flex flex-wrap items-center justify-between gap-3">
              <input type="hidden" name="editionId" value={e.id} />
              <input type="hidden" name="lang" value={lang} />
              <div>
                <div className="font-medium">{t.formats[e.format]}</div>
                <div className="text-sm text-muted">
                  {e.page_count ? `${e.page_count} ${t.book.pages}` : null}
                  {e.isbn ? ` · ${t.book.isbn} ${e.isbn}` : null}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold">{formatPrice(e.price_cents, priceLocale)}</span>
                <button className="btn">{t.book.buy}</button>
              </div>
            </form>
          ))}
        </div>
        {editions.some((e) => e.format !== "ebook") && <p className="mt-3 text-sm text-muted">{t.book.shippingNote}</p>}
        {elsewhere.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-muted">{t.channels.alsoOn}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {elsewhere.map((s) => (
                <a key={s.name} href={s.url} target="_blank" rel="noreferrer" className="btn-ghost">
                  {s.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
