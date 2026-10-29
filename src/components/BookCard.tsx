import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { type BookWithAuthor, coverUrl } from "@/lib/books";

export function BookCard({ book, lang }: { book: BookWithAuthor; lang: Locale }) {
  const t = getDictionary(lang);
  const cover = coverUrl(book.cover_image_path);
  return (
    <Link href={`/${lang}/books/${book.slug}`} className="group block">
      <div className="aspect-[3/4] overflow-hidden rounded-md border border-line bg-card">
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={cover} alt="" className="h-full w-full object-cover transition group-hover:scale-[1.02]" />
        ) : (
          <div className="flex h-full items-center justify-center p-4 text-center font-serif text-lg">{book.title}</div>
        )}
      </div>
      <div className="mt-2 font-medium leading-snug">{book.title}</div>
      <div className="text-sm text-muted">
        {book.author?.display_name} · {t.languages[book.language]}
      </div>
    </Link>
  );
}
