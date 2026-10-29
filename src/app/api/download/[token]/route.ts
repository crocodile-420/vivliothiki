import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MAX_DOWNLOADS = 10;

// Personal ebook download link: works for paid orders, a limited number of times, via a short-lived signed URL.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[0-9a-f-]{36}$/.test(token)) return new NextResponse("Not found", { status: 404 });
  const db = supabaseAdmin();
  const { data: item } = await db
    .from("order_items")
    .select("id, download_count, fulfillment, orders!inner(status), editions!inner(ebook_path)")
    .eq("download_token", token)
    .maybeSingle();
  const path = (item?.editions as unknown as { ebook_path: string | null } | undefined)?.ebook_path;
  if (!item || item.fulfillment !== "digital" || !path) return new NextResponse("Not found", { status: 404 });
  if ((item.orders as unknown as { status: string }).status === "pending") return new NextResponse("Payment pending", { status: 402 });
  if (item.download_count >= MAX_DOWNLOADS) return new NextResponse("Download limit reached", { status: 410 });

  await db.from("order_items").update({ download_count: item.download_count + 1 }).eq("id", item.id);
  const { data, error } = await db.storage.from("book-files").createSignedUrl(path, 60, { download: true });
  if (error) return new NextResponse("Unavailable", { status: 500 });
  return NextResponse.redirect(data.signedUrl);
}
