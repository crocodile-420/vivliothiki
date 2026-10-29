import type { BOOK_LANGUAGES, CATEGORIES } from "@/i18n/config";

export type BookStatus = "draft" | "in_review" | "published" | "rejected";
export type EditionFormat = "paperback" | "hardcover" | "ebook";

export interface Profile {
  id: string;
  display_name: string;
  handle: string | null;
  bio: string;
  is_admin: boolean;
}

export interface Edition {
  id: string;
  book_id: string;
  format: EditionFormat;
  price_cents: number;
  isbn: string | null;
  page_count: number | null;
  pod_package_id: string | null;
  print_cost_cents: number | null;
  interior_path: string | null;
  cover_path: string | null;
  ebook_path: string | null;
}

export interface Book {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  language: (typeof BOOK_LANGUAGES)[number];
  category: (typeof CATEGORIES)[number];
  cover_image_path: string | null;
  status: BookStatus;
  review_note: string;
  published_at: string | null;
}

export type BookWithAuthor = Book & { author: Pick<Profile, "display_name" | "handle"> | null };

export function coverUrl(path: string | null): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/covers/${path}`;
}

// Greek titles become Latin slugs so URLs stay readable everywhere.
const GREEK: Record<string, string> = {
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m", ν: "n", ξ: "x",
  ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
};

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[α-ω]/g, (c) => GREEK[c] ?? "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
