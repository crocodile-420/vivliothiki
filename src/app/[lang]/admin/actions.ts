"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function approveBook(lang: string, bookId: string) {
  await requireAdmin(lang);
  await supabaseAdmin()
    .from("books")
    .update({ status: "published", review_note: "", published_at: new Date().toISOString() })
    .eq("id", bookId);
  revalidatePath(`/${lang}/admin`);
}

export async function rejectBook(lang: string, bookId: string, form: FormData) {
  await requireAdmin(lang);
  await supabaseAdmin()
    .from("books")
    .update({ status: "rejected", review_note: String(form.get("note") ?? "") })
    .eq("id", bookId);
  revalidatePath(`/${lang}/admin`);
}

export async function setStock(lang: string, editionId: string, form: FormData) {
  await requireAdmin(lang);
  const quantity = Math.max(0, Math.floor(Number(form.get("quantity"))));
  const cost = Math.round(Number(String(form.get("unitCost")).replace(",", ".")) * 100);
  await supabaseAdmin()
    .from("editions")
    .update({ stock_quantity: quantity, stock_unit_cost_cents: Number.isFinite(cost) ? cost : null })
    .eq("id", editionId);
  revalidatePath(`/${lang}/admin`);
}

export async function markShipped(lang: string, itemId: string, orderId: string, form: FormData) {
  await requireAdmin(lang);
  const db = supabaseAdmin();
  const tracking = String(form.get("tracking") ?? "") || null;
  await db.from("order_items").update({ shipped_at: new Date().toISOString(), tracking_url: tracking }).eq("id", itemId);
  await db.from("orders").update({ status: "shipped", tracking_url: tracking, updated_at: new Date().toISOString() }).eq("id", orderId);
  revalidatePath(`/${lang}/admin`);
}

const CHANNEL_STATUSES = ["requested", "listed", "withdrawing", "paused", "rejected"] as const;

// Records what happened on a marketplace: live (with its link), paused, taken down or not accepted.
export async function setChannel(lang: string, bookId: string, channel: string, form: FormData) {
  await requireAdmin(lang);
  const status = String(form.get("status"));
  if (!(CHANNEL_STATUSES as readonly string[]).includes(status)) throw new Error("Unknown status");
  const url = String(form.get("url") ?? "").trim();
  if (url && !/^https:\/\//.test(url)) throw new Error("The listing link must start with https://");
  await supabaseAdmin()
    .from("book_channels")
    .update({
      status,
      listing_url: url || null,
      note: String(form.get("note") ?? ""),
      ...(status === "listed" ? { listed_at: new Date().toISOString() } : {}),
    })
    .eq("book_id", bookId)
    .eq("channel", channel);
  revalidatePath(`/${lang}/admin`);
}
