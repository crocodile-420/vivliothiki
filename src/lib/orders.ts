import type Stripe from "stripe";
import type { Edition } from "@/lib/books";
import { createPrintJob, type LuluAddress } from "@/lib/lulu";
import { splitSale } from "@/lib/pricing";
import { supabaseAdmin } from "@/lib/supabase/server";

const SIGNED_URL_SECONDS = 7 * 24 * 3600; // Lulu may fetch the files a few days after the order.

// Stripe moved shipping details in newer API versions; accept both shapes.
function shippingOf(session: Stripe.Checkout.Session) {
  const s = session as Stripe.Checkout.Session & {
    shipping_details?: { name?: string | null; address?: Stripe.Address | null } | null;
  };
  return s.collected_information?.shipping_details ?? s.shipping_details ?? null;
}

export function toLuluAddress(session: Stripe.Checkout.Session): LuluAddress | null {
  const shipping = shippingOf(session);
  const a = shipping?.address;
  if (!shipping?.name || !a?.line1 || !a.city || !a.country) return null;
  return {
    name: shipping.name,
    street1: a.line1,
    street2: a.line2 ?? undefined,
    city: a.city,
    postcode: a.postal_code ?? "",
    country_code: a.country,
    state_code: a.state ?? undefined,
    phone_number: session.customer_details?.phone ?? "",
    email: session.customer_details?.email ?? undefined,
  };
}

// Records a paid Checkout Session as an order and starts fulfillment. Safe to call twice for the same session.
export async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const db = supabaseAdmin();
  const editionId = session.metadata?.editionId;
  if (!editionId) throw new Error(`Session ${session.id} has no edition`);

  const { data: edition } = await db.from("editions").select("*, books!inner(title, author_id)").eq("id", editionId).single();
  if (!edition) throw new Error(`Edition ${editionId} not found`);
  const book = edition.books as { title: string; author_id: string };
  const e = edition as Edition & { stock_unit_cost_cents: number | null };

  const { data: order, error } = await db
    .from("orders")
    .insert({
      stripe_session_id: session.id,
      email: session.customer_details?.email ?? "",
      status: "paid",
      shipping_address: shippingOf(session),
      amount_total_cents: session.amount_total ?? 0,
    })
    .select("id")
    .single();
  // A duplicate webhook delivery hits the unique session id; the first delivery already did the work.
  if (error?.code === "23505") return;
  if (error) throw new Error(error.message);

  const quantity = 1;
  let fulfillment: "digital" | "stock" | "lulu" = "digital";
  if (e.format !== "ebook") {
    const { data: fromStock } = await db.rpc("take_stock", { p_edition: e.id, p_quantity: quantity });
    fulfillment = fromStock ? "stock" : "lulu";
  }
  const printCost = fulfillment === "stock" ? (e.stock_unit_cost_cents ?? 0) : fulfillment === "lulu" ? (e.print_cost_cents ?? 0) : 0;
  const split = splitSale({
    priceCents: e.price_cents,
    printCostCents: printCost,
    commissionPercent: Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 20),
  });

  await db.from("order_items").insert({
    order_id: order.id,
    edition_id: e.id,
    author_id: book.author_id,
    quantity,
    unit_price_cents: e.price_cents,
    author_earnings_cents: split.authorCents * quantity,
    fulfillment,
    download_token: session.metadata?.downloadToken ?? crypto.randomUUID(),
  });

  if (fulfillment !== "lulu") return;
  try {
    const address = toLuluAddress(session);
    if (!address) throw new Error("Missing shipping address");
    const sign = async (path: string | null) => {
      if (!path) throw new Error("Edition is missing print files");
      const { data, error: signError } = await db.storage.from("book-files").createSignedUrl(path, SIGNED_URL_SECONDS);
      if (signError) throw new Error(signError.message);
      return data.signedUrl;
    };
    const job = await createPrintJob({
      externalId: order.id,
      contactEmail: process.env.LULU_CONTACT_EMAIL ?? session.customer_details?.email ?? "",
      address,
      lines: [
        {
          externalId: e.id,
          title: book.title,
          podPackageId: e.pod_package_id!,
          interiorUrl: await sign(e.interior_path),
          coverUrl: await sign(e.cover_path),
          quantity,
        },
      ],
    });
    await db
      .from("orders")
      .update({ status: "in_production", lulu_print_job_id: String(job.id), lulu_status: job.status.name, updated_at: new Date().toISOString() })
      .eq("id", order.id);
  } catch (err) {
    // The payment stands; the admin page lists failed orders so they can be retried or refunded by hand.
    await db
      .from("orders")
      .update({ status: "failed", error: err instanceof Error ? err.message : String(err), updated_at: new Date().toISOString() })
      .eq("id", order.id);
  }
}
