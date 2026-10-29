import { getDictionary } from "@/i18n/dictionaries";
import { coverUrl, type EditionFormat } from "./books";
import { CHANNELS, type ChannelKey } from "./channels";
import { siteUrl } from "./env";
import { type FeedProduct, feedProducts } from "./feeds";
import { supabaseAdmin } from "./supabase/server";

// The products for one feed: published books whose authors turned on any of these channels.
export async function loadFeedProducts(channels: ChannelKey[]): Promise<FeedProduct[]> {
  const formats = CHANNELS.find((c) => c.key === channels[0])?.formats ?? "all";
  const { data } = await supabaseAdmin()
    .from("book_channels")
    .select("book_id, books!inner(slug, title, subtitle, description, language, category, cover_image_path, status, author:profiles(display_name), editions(id, format, price_cents, isbn, stock_quantity))")
    .in("channel", channels)
    .in("status", ["requested", "listed"])
    .eq("books.status", "published");
  type Row = {
    book_id: string;
    books: {
      slug: string; title: string; subtitle: string; description: string; language: string; category: string;
      cover_image_path: string | null; author: { display_name: string } | null;
      editions: { id: string; format: EditionFormat; price_cents: number; isbn: string | null; stock_quantity: number }[];
    };
  };
  // A book that turned on two channels sharing this feed appears once.
  const books = new Map(((data ?? []) as unknown as Row[]).map((r) => [r.book_id, r.books]));
  const t = getDictionary("el");
  return feedProducts(
    [...books.values()].map((b) => ({
      ...b,
      language: b.language as never,
      category: b.category as never,
      author: b.author?.display_name ?? "",
      image: coverUrl(b.cover_image_path),
    })),
    {
      siteUrl: siteUrl(),
      formats,
      formatLabel: (f) => t.formats[f],
      categoryLabel: (c) => t.categories[c as keyof typeof t.categories] ?? c,
    },
  );
}

export const xmlResponse = (body: string) =>
  new Response(body, { headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" } });
