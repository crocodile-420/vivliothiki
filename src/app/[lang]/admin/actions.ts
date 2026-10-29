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
