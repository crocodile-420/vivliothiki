import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { supabaseAdmin } from "@/lib/supabase/server";

export default async function Success({
  params,
  searchParams,
}: {
  params: Promise<{ lang: Locale }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { lang } = await params;
  const { session_id } = await searchParams;
  const t = getDictionary(lang);
  const { data: order } = session_id
    ? await supabaseAdmin().from("orders").select("id, order_items(download_token, fulfillment)").eq("stripe_session_id", session_id).maybeSingle()
    : { data: null };

  return (
    <div className="mx-auto max-w-xl text-center">
      <h1 className="text-3xl font-bold">{t.checkout.successTitle}</h1>
      {order ? (
        <>
          <p className="mt-4 text-muted">{t.checkout.successBody}</p>
          {order.order_items
            .filter((i) => i.fulfillment === "digital")
            .map((i) => (
              <a key={i.download_token} href={`/api/download/${i.download_token}`} className="btn mt-6">
                {t.checkout.downloads}
              </a>
            ))}
        </>
      ) : (
        <p className="mt-4 text-muted">{t.checkout.processing}</p>
      )}
    </div>
  );
}
