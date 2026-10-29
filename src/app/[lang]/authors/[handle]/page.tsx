import { notFound } from "next/navigation";
import { BookCard } from "@/components/BookCard";
import type { Locale } from "@/i18n/config";
import { publishedBooks } from "@/lib/catalog";
import { supabaseServer } from "@/lib/supabase/server";

export default async function AuthorPage({ params }: { params: Promise<{ lang: Locale; handle: string }> }) {
  const { lang, handle } = await params;
  const supabase = await supabaseServer();
  const { data: author } = await supabase.from("profiles").select("id, display_name, bio").eq("handle", handle).maybeSingle();
  if (!author) notFound();
  const books = await publishedBooks({ authorId: author.id });
  return (
    <div>
      <h1 className="text-3xl font-bold">{author.display_name}</h1>
      {author.bio && <p className="mt-4 max-w-2xl whitespace-pre-line text-muted">{author.bio}</p>}
      <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {books.map((b) => (
          <BookCard key={b.id} book={b} lang={lang} />
        ))}
      </div>
    </div>
  );
}
