import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Book, Edition } from "@/lib/books";
import { formatPrice } from "@/lib/pricing";
import { requireAdmin } from "@/lib/session";
import { supabaseAdmin } from "@/lib/supabase/server";
import { approveBook, markShipped, rejectBook, setStock } from "./actions";

// The review page is for the platform owner only, so its extra labels are Greek only.
const adminText = { stock: "Απόθεμα", unitCost: "Κόστος/τεμ. (€)", toShip: "Προς αποστολή από απόθεμα", shipped: "Στάλθηκε", tracking: "Αριθμός αποστολής" };

export default async function Admin({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  await requireAdmin(lang);
  const db = supabaseAdmin();

  const [{ data: pending }, { data: printEditions }, { data: toShip }, { data: orders }] = await Promise.all([
    db.from("books").select("*, editions(*), author:profiles(display_name)").eq("status", "in_review").order("created_at"),
    db.from("editions").select("*, books!inner(title, status)").neq("format", "ebook").eq("books.status", "published"),
    db
      .from("order_items")
      .select("id, quantity, editions(format, books(title)), orders!inner(id, email, shipping_address, created_at)")
      .eq("fulfillment", "stock")
      .is("shipped_at", null),
    db.from("orders").select("*").order("created_at", { ascending: false }).limit(30),
  ]);

  // Reviewers open the author's files through short-lived links.
  const sign = async (path: string | null) =>
    path ? (await db.storage.from("book-files").createSignedUrl(path, 3600)).data?.signedUrl : undefined;

  const reviews = await Promise.all(
    ((pending ?? []) as (Book & { editions: Edition[]; author: { display_name: string } })[]).map(async (b) => ({
      ...b,
      files: await Promise.all(
        b.editions.map(async (e) => ({
          edition: e,
          interior: await sign(e.interior_path),
          cover: await sign(e.cover_path),
          ebook: await sign(e.ebook_path),
        })),
      ),
    })),
  );

  return (
    <div className="space-y-12">
      <section>
        <h1 className="text-3xl font-bold">{t.admin.title}</h1>
        {reviews.length === 0 && <p className="mt-4 text-muted">{t.admin.empty}</p>}
        <div className="mt-4 space-y-4">
          {reviews.map((b) => (
            <div key={b.id} className="panel space-y-3">
              <div className="font-semibold">
                {b.title} · <span className="text-muted">{b.author?.display_name}</span>
              </div>
              <ul className="text-sm">
                {b.files.map(({ edition, interior, cover, ebook }) => (
                  <li key={edition.id}>
                    {t.formats[edition.format]} · {formatPrice(edition.price_cents)}
                    {edition.page_count ? ` · ${edition.page_count} ${t.book.pages}` : ""}{" "}
                    {interior && <a className="underline" href={interior}>interior</a>}{" "}
                    {cover && <a className="underline" href={cover}>cover</a>}{" "}
                    {ebook && <a className="underline" href={ebook}>ebook</a>}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap items-start gap-3">
                <form action={approveBook.bind(null, lang, b.id)}>
                  <button className="btn">{t.admin.approve}</button>
                </form>
                <form action={rejectBook.bind(null, lang, b.id)} className="flex flex-1 gap-2">
                  <input name="note" placeholder={t.admin.note} className="field mt-0" required />
                  <button className="btn-ghost">{t.admin.reject}</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">{adminText.toShip}</h2>
        <div className="mt-4 space-y-3">
          {(toShip ?? []).map((item) => {
            const order = item.orders as unknown as { id: string; email: string; shipping_address: { name?: string; address?: Record<string, string> } | null };
            const edition = item.editions as unknown as { format: Edition["format"]; books: { title: string } };
            const a = order.shipping_address?.address;
            return (
              <div key={item.id} className="panel flex flex-wrap items-center justify-between gap-3 text-sm">
                <div>
                  <div className="font-medium">
                    {item.quantity}× {edition.books.title} ({t.formats[edition.format]})
                  </div>
                  <div className="text-muted">
                    {order.shipping_address?.name}, {a?.line1} {a?.line2}, {a?.postal_code} {a?.city}, {a?.country} · {order.email}
                  </div>
                </div>
                <form action={markShipped.bind(null, lang, item.id, order.id)} className="flex gap-2">
                  <input name="tracking" placeholder={adminText.tracking} className="field mt-0" />
                  <button className="btn">{adminText.shipped}</button>
                </form>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">{adminText.stock}</h2>
        <div className="mt-4 space-y-2">
          {((printEditions ?? []) as (Edition & { stock_quantity: number; stock_unit_cost_cents: number | null; books: { title: string } })[]).map((e) => (
            <form key={e.id} action={setStock.bind(null, lang, e.id)} className="panel flex flex-wrap items-end gap-3 text-sm">
              <div className="min-w-48 flex-1 font-medium">
                {e.books.title} · {t.formats[e.format]}
              </div>
              <label className="label">
                {adminText.stock}
                <input name="quantity" type="number" min={0} defaultValue={e.stock_quantity} className="field w-24" />
              </label>
              <label className="label">
                {adminText.unitCost}
                <input name="unitCost" inputMode="decimal" defaultValue={e.stock_unit_cost_cents != null ? (e.stock_unit_cost_cents / 100).toFixed(2) : ""} className="field w-28" />
              </label>
              <button className="btn-ghost">{t.dashboard.save}</button>
            </form>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-bold">{t.admin.orders}</h2>
        <table className="mt-4 w-full text-left text-sm">
          <tbody>
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-b border-line">
                <td className="py-2">{new Date(o.created_at).toLocaleString(lang)}</td>
                <td>{o.email}</td>
                <td>{formatPrice(o.amount_total_cents)}</td>
                <td>{o.status}</td>
                <td className="text-red-600">{o.error}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
