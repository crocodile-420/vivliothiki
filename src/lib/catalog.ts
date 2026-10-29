import type { BookWithAuthor, Edition } from "@/lib/books";
import { supabaseServer } from "@/lib/supabase/server";

const BOOK_WITH_AUTHOR = "*, author:profiles(display_name, handle)";

export async function publishedBooks(filter: { language?: string; category?: string; authorId?: string; limit?: number } = {}) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) return [];
  const supabase = await supabaseServer();
  let query = supabase.from("books").select(BOOK_WITH_AUTHOR).eq("status", "published").order("published_at", { ascending: false });
  if (filter.language) query = query.eq("language", filter.language);
  if (filter.category) query = query.eq("category", filter.category);
  if (filter.authorId) query = query.eq("author_id", filter.authorId);
  if (filter.limit) query = query.limit(filter.limit);
  const { data } = await query;
  return (data ?? []) as BookWithAuthor[];
}

export async function bookBySlug(slug: string) {
  const supabase = await supabaseServer();
  const { data } = await supabase.from("books").select(`${BOOK_WITH_AUTHOR}, editions(*)`).eq("slug", slug).maybeSingle();
  return data as (BookWithAuthor & { editions: Edition[] }) | null;
}
