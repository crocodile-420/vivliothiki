import { notFound } from "next/navigation";
import { BOOK_LANGUAGES, CATEGORIES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { type Book, coverUrl, type Edition } from "@/lib/books";
import { PRINT_PACKAGES } from "@/lib/lulu";
import { formatPrice, minimumPrintPriceCents, splitSale } from "@/lib/pricing";
import { requireProfile } from "@/lib/session";
import { supabaseServer } from "@/lib/supabase/server";
import { deleteEdition, submitForReview, updateBook } from "../../actions";
import { type ChannelRow, Channels } from "./Channels";
import { CoverUpload } from "./CoverUpload";
import { EditionForm } from "./EditionForm";

const commission = () => Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 20);

export default async function BookEditor({ params }: { params: Promise<{ lang: Locale; id: string }> }) {
  const { lang, id } = await params;
  const t = getDictionary(lang);
  const profile = await requireProfile(lang);
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("books")
    .select("*, editions(*), book_channels(channel, status, listing_url, note)")
    .eq("id", id)
    .eq("author_id", profile.id)
    .maybeSingle();
  if (!data) notFound();
  const book = data as Book & { editions: Edition[]; book_channels: ChannelRow[] };
  const editable = book.status === "draft" || book.status === "rejected";
  const packages = Object.entries(PRINT_PACKAGES).map(([key, p]) => ({ key, label: p.label[lang] }));

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">{book.title}</h1>
        <span className="rounded-full border border-line px-3 py-1 text-sm">{t.status[book.status]}</span>
      </div>
      {book.review_note && (
        <div className="panel border-accent">
          <div className="text-sm font-semibold">{t.editor.reviewNote}</div>
          <p className="mt-1 whitespace-pre-line">{book.review_note}</p>
        </div>
      )}

      <section className="panel grid gap-6 md:grid-cols-[200px_1fr]">
        <div>
          <div className="aspect-[3/4] overflow-hidden rounded-md border border-line">
            {book.cover_image_path && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl(book.cover_image_path)!} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          {editable && <CoverUpload bookId={book.id} userId={profile.id} label={t.editor.coverImage} />}
        </div>
        <form action={updateBook.bind(null, lang, book.id)} className="grid gap-4">
          <fieldset disabled={!editable} className="grid gap-4">
            <label className="label">
              {t.editor.title}
              <input name="title" required defaultValue={book.title} className="field" />
            </label>
            <label className="label">
              {t.editor.subtitle}
              <input name="subtitle" defaultValue={book.subtitle} className="field" />
            </label>
            <label className="label">
              {t.editor.description}
              <textarea name="description" rows={6} defaultValue={book.description} className="field" />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="label">
                {t.editor.language}
                <select name="language" defaultValue={book.language} className="field">
                  {BOOK_LANGUAGES.map((l) => (
                    <option key={l} value={l}>
                      {t.languages[l]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="label">
                {t.editor.category}
                <select name="category" defaultValue={book.category} className="field">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t.categories[c]}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {editable && (
              <div>
                <button className="btn">{t.editor.save}</button>
              </div>
            )}
          </fieldset>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">{t.editor.editions}</h2>
        {book.editions.map((e) => {
          const split = splitSale({ priceCents: e.price_cents, printCostCents: e.print_cost_cents ?? 0, commissionPercent: commission() });
          return (
            <div key={e.id} className="panel flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="font-medium">{t.formats[e.format]}</div>
                <div className="text-sm text-muted">
                  {formatPrice(e.price_cents)}
                  {e.page_count ? ` · ${e.page_count} ${t.book.pages}` : ""}
                  {e.print_cost_cents != null &&
                    ` · ${t.editor.printCost} ${formatPrice(e.print_cost_cents)} · ${t.editor.minPrice} ${formatPrice(minimumPrintPriceCents(e.print_cost_cents))}`}
                </div>
                <div className="text-sm">
                  {t.editor.youEarn} <strong>{formatPrice(split.authorCents)}</strong>
                </div>
              </div>
              {editable && (
                <form action={deleteEdition.bind(null, lang, book.id, e.id)}>
                  <button className="btn-ghost">{t.editor.remove}</button>
                </form>
              )}
            </div>
          );
        })}
        {editable && (
          <EditionForm
            lang={lang}
            bookId={book.id}
            userId={profile.id}
            packages={packages}
            text={t.editor}
            coverText={t.coverBuilder}
            manuscriptText={t.manuscript}
            bookTitle={book.title}
            bookSubtitle={book.subtitle}
            bookLanguage={book.language}
            authorName={profile.display_name}
          />
        )}
      </section>

      <Channels
        lang={lang}
        bookId={book.id}
        published={book.status === "published"}
        formats={book.editions.map((e) => e.format)}
        rows={book.book_channels ?? []}
        text={t.channels}
      />

      {editable && (
        <section className="panel">
          <form action={submitForReview.bind(null, lang, book.id)}>
            <button className="btn" disabled={book.editions.length === 0}>
              {t.editor.submit}
            </button>
          </form>
          <p className="mt-2 text-sm text-muted">{book.editions.length === 0 ? t.editor.needsEdition : t.editor.submitHelp}</p>
        </section>
      )}
    </div>
  );
}
