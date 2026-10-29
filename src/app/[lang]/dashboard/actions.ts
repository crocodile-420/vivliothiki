"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { BOOK_LANGUAGES, CATEGORIES } from "@/i18n/config";
import { slugify } from "@/lib/books";
import { CHANNELS, type ChannelKey, channel } from "@/lib/channels";
import { type CoverSize, estimateCoverSize, PT_PER_INCH, trimFromPodPackage } from "@/lib/cover";
import { coverDimensions, PRINT_PACKAGES, type PrintPackageKey, printCostCents } from "@/lib/lulu";
import { currentUser, supabaseAdmin, supabaseServer } from "@/lib/supabase/server";

const bookFields = z.object({
  title: z.string().trim().min(1).max(200),
  subtitle: z.string().trim().max(200).default(""),
  description: z.string().trim().max(5000).default(""),
  language: z.enum(BOOK_LANGUAGES),
  category: z.enum(CATEGORIES),
});

async function signedIn() {
  const user = await currentUser();
  if (!user) throw new Error("Not signed in");
  return user;
}

export async function createBook(lang: string, form: FormData) {
  const user = await signedIn();
  const fields = bookFields.parse(Object.fromEntries(form));
  const supabase = await supabaseServer();
  // A short random suffix keeps slugs unique when two authors pick the same title.
  const slug = `${slugify(fields.title) || "book"}-${crypto.randomUUID().slice(0, 6)}`;
  const { data, error } = await supabase
    .from("books")
    .insert({ ...fields, slug, author_id: user.id })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  redirect(`/${lang}/dashboard/books/${data.id}`);
}

export async function updateBook(lang: string, bookId: string, form: FormData) {
  await signedIn();
  const fields = bookFields.parse(Object.fromEntries(form));
  const supabase = await supabaseServer();
  const { error } = await supabase.from("books").update(fields).eq("id", bookId);
  if (error) throw new Error(error.message);
  revalidatePath(`/${lang}/dashboard/books/${bookId}`);
}

// Called by the editor after the browser has uploaded the image straight to storage.
export async function setCoverImage(bookId: string, path: string) {
  const user = await signedIn();
  if (!path.startsWith(`${user.id}/`)) throw new Error("Invalid path");
  const supabase = await supabaseServer();
  const { error } = await supabase.from("books").update({ cover_image_path: path }).eq("id", bookId);
  if (error) throw new Error(error.message);
}

const editionInput = z.object({
  bookId: z.string().uuid(),
  kind: z.union([z.literal("ebook"), z.enum(Object.keys(PRINT_PACKAGES) as [PrintPackageKey, ...PrintPackageKey[]])]),
  priceCents: z.number().int().min(0).max(100_000),
  pageCount: z.number().int().min(2).max(800).nullable(),
  isbn: z.string().trim().max(20).nullable(),
  interiorPath: z.string().nullable(),
  coverPath: z.string().nullable(),
  ebookPath: z.string().nullable(),
});

export type EditionInput = z.infer<typeof editionInput>;

// Saves one format of a book. Files are already in storage; we only record their paths.
export async function saveEdition(lang: string, input: EditionInput): Promise<{ printCostCents: number | null }> {
  const user = await signedIn();
  const e = editionInput.parse(input);
  for (const p of [e.interiorPath, e.coverPath, e.ebookPath]) {
    if (p && !p.startsWith(`${user.id}/`)) throw new Error("Invalid path");
  }
  const supabase = await supabaseServer();
  const pkg = e.kind === "ebook" ? null : PRINT_PACKAGES[e.kind];

  let cost: number | null = null;
  if (pkg && e.pageCount && process.env.LULU_CLIENT_KEY) {
    try {
      cost = await printCostCents(pkg.podPackageId, e.pageCount);
    } catch (err) {
      console.error("Lulu cost calculation failed", err);
    }
  }

  const row = {
    book_id: e.bookId,
    format: pkg ? pkg.format : "ebook",
    price_cents: e.priceCents,
    page_count: e.pageCount,
    isbn: e.isbn || null,
    pod_package_id: pkg?.podPackageId ?? null,
    interior_path: pkg ? e.interiorPath : null,
    cover_path: pkg ? e.coverPath : null,
    ebook_path: pkg ? null : e.ebookPath,
  };
  const { data: saved, error } = await supabase
    .from("editions")
    .upsert(row, { onConflict: "book_id,format" })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  // Authors can't write the print cost themselves (it sets their payout), so the server records it.
  await supabaseAdmin().from("editions").update({ print_cost_cents: cost }).eq("id", saved.id);
  revalidatePath(`/${lang}/dashboard/books/${e.bookId}`);
  return { printCostCents: cost };
}

export async function deleteEdition(lang: string, bookId: string, editionId: string) {
  await signedIn();
  const supabase = await supabaseServer();
  const { error } = await supabase.from("editions").delete().eq("id", editionId);
  if (error) throw new Error(error.message);
  revalidatePath(`/${lang}/dashboard/books/${bookId}`);
}

export async function submitForReview(lang: string, bookId: string) {
  await signedIn();
  const supabase = await supabaseServer();
  const { data: editions } = await supabase.from("editions").select("*").eq("book_id", bookId);
  const ready = (editions ?? []).some((e) =>
    e.format === "ebook" ? Boolean(e.ebook_path) : Boolean(e.interior_path && e.cover_path && e.page_count),
  );
  if (!ready) throw new Error("Book has no complete edition");
  const { error } = await supabase.from("books").update({ status: "in_review" }).eq("id", bookId);
  if (error) throw new Error(error.message);
  revalidatePath(`/${lang}/dashboard`);
  redirect(`/${lang}/dashboard`);
}

const profileFields = z.object({
  display_name: z.string().trim().min(1).max(100),
  handle: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]{3,40}$/)
    .or(z.literal("")),
  bio: z.string().trim().max(2000).default(""),
});

export async function updateProfile(lang: string, form: FormData) {
  const user = await signedIn();
  const fields = profileFields.parse(Object.fromEntries(form));
  const supabase = await supabaseServer();
  const { error } = await supabase
    .from("profiles")
    .update({ ...fields, handle: fields.handle || null })
    .eq("id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath(`/${lang}/dashboard`);
}

// The exact wraparound cover size for a print format, from Lulu when configured, otherwise an estimate.
export async function coverSizeFor(kind: PrintPackageKey, pageCount: number): Promise<CoverSize> {
  await signedIn();
  const pkg = PRINT_PACKAGES[kind];
  if (!pkg) throw new Error("Unknown format");
  const pages = z.number().int().min(2).max(800).parse(pageCount);
  if (process.env.LULU_CLIENT_KEY) {
    try {
      const d = await coverDimensions(pkg.podPackageId, pages);
      const { widthIn, heightIn } = trimFromPodPackage(pkg.podPackageId);
      return {
        widthPt: Number(d.width),
        heightPt: Number(d.height),
        trimWidthPt: widthIn * PT_PER_INCH,
        trimHeightPt: heightIn * PT_PER_INCH,
        source: "lulu",
      };
    } catch (err) {
      console.error("Lulu cover dimensions failed", err);
    }
  }
  return estimateCoverSize(pkg.podPackageId, pages);
}

const channelKey = z.enum(CHANNELS.map((c) => c.key) as [ChannelKey, ...ChannelKey[]]);

// Turns a sales channel on for one of the author's books. A rejected or paused channel can be asked for again.
export async function requestChannel(lang: string, bookId: string, key: ChannelKey) {
  await signedIn();
  const k = channelKey.parse(key);
  const supabase = await supabaseServer();
  await supabase.from("book_channels").delete().eq("book_id", bookId).eq("channel", k).in("status", ["paused", "rejected"]);
  const { error } = await supabase.from("book_channels").insert({ book_id: bookId, channel: k });
  if (error) throw new Error(error.message);
  revalidatePath(`/${lang}/dashboard/books/${bookId}`);
}

// Turns a channel off. A live marketplace listing can only be taken down by us, so it is flagged for an admin.
export async function withdrawChannel(lang: string, bookId: string, key: ChannelKey) {
  await signedIn();
  const k = channelKey.parse(key);
  const supabase = await supabaseServer();
  // Reading through row level security also proves the book is the author's.
  const { data: row } = await supabase.from("book_channels").select("status").eq("book_id", bookId).eq("channel", k).maybeSingle();
  if (!row) return;
  if (row.status === "listed" && channel(k)?.mode === "managed") {
    await supabaseAdmin().from("book_channels").update({ status: "withdrawing" }).eq("book_id", bookId).eq("channel", k);
  } else if (row.status === "listed") {
    // Feed channels are never written as 'listed', but stay safe if an admin set one by hand.
    await supabaseAdmin().from("book_channels").delete().eq("book_id", bookId).eq("channel", k);
  } else {
    const { error } = await supabase.from("book_channels").delete().eq("book_id", bookId).eq("channel", k);
    if (error) throw new Error(error.message);
  }
  revalidatePath(`/${lang}/dashboard/books/${bookId}`);
}
