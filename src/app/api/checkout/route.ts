import { NextResponse } from "next/server";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { SHIP_TO } from "@/lib/countries";
import { siteUrl } from "@/lib/env";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/server";

// Starts a Stripe Checkout for one edition. The order itself is created by the Stripe webhook once paid.
export async function POST(request: Request) {
  const form = await request.formData();
  const editionId = String(form.get("editionId") ?? "");
  const langParam = String(form.get("lang") ?? "el");
  const lang = isLocale(langParam) ? langParam : "el";
  const t = getDictionary(lang);

  const { data: edition } = await supabaseAdmin()
    .from("editions")
    .select("id, format, price_cents, books!inner(title, slug, status)")
    .eq("id", editionId)
    .eq("books.status", "published")
    .maybeSingle();
  if (!edition) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const book = edition.books as unknown as { title: string; slug: string };
  const isPrint = edition.format !== "ebook";

  // Ebook buyers get their link in the Stripe receipt, so the token exists before payment.
  const downloadToken = crypto.randomUUID();
  const downloadUrl = `${siteUrl()}/api/download/${downloadToken}`;

  const session = await stripe().checkout.sessions.create({
    mode: "payment",
    locale: lang === "el" ? "el" : "en",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: edition.price_cents,
          tax_behavior: "inclusive",
          product_data: { name: `${book.title} (${t.formats[edition.format as keyof typeof t.formats]})` },
        },
      },
    ],
    metadata: { editionId: edition.id, downloadToken },
    payment_intent_data: isPrint ? undefined : { description: `${t.checkout.downloads}: ${downloadUrl}` },
    ...(isPrint && {
      shipping_address_collection: { allowed_countries: SHIP_TO },
      phone_number_collection: { enabled: true }, // the printer's courier requires a phone number
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            display_name: lang === "el" ? "Ταχυδρομική αποστολή με αριθμό αποστολής" : "Tracked mail",
            fixed_amount: { amount: Number(process.env.SHIPPING_FEE_CENTS ?? 490), currency: "eur" },
            tax_behavior: "inclusive",
            delivery_estimate: { minimum: { unit: "business_day", value: 5 }, maximum: { unit: "business_day", value: 12 } },
          },
        },
      ],
    }),
    success_url: `${siteUrl()}/${lang}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl()}/${lang}/books/${book.slug}`,
  });

  return NextResponse.redirect(session.url!, { status: 303 });
}
