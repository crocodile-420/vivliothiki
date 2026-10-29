import { NextResponse } from "next/server";
import type { LuluPrintJobEvent } from "@/lib/lulu";
import { supabaseAdmin } from "@/lib/supabase/server";

// Lulu calls this when a print job changes status. Register it with ?secret=<LULU_WEBHOOK_SECRET>.
export async function POST(request: Request) {
  const secret = new URL(request.url).searchParams.get("secret");
  if (!process.env.LULU_WEBHOOK_SECRET || secret !== process.env.LULU_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const event = (await request.json()) as LuluPrintJobEvent;
  if (event.topic !== "PRINT_JOB_STATUS_CHANGED") return NextResponse.json({ ignored: true });

  const status = event.data.status.name;
  const tracking = event.data.line_items?.flatMap((l) => l.tracking_urls ?? [])[0] ?? null;
  const update: Record<string, unknown> = { lulu_status: status, updated_at: new Date().toISOString() };
  if (status === "SHIPPED") Object.assign(update, { status: "shipped", tracking_url: tracking });
  if (status === "CANCELED" || status === "REJECTED") update.status = "failed";

  await supabaseAdmin().from("orders").update(update).eq("lulu_print_job_id", String(event.data.id));
  return NextResponse.json({ received: true });
}
