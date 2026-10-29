import Link from "next/link";
import { BOOK_LANGUAGES, CATEGORIES, type Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import type { Book } from "@/lib/books";
import { formatPrice } from "@/lib/pricing";
import { requireProfile } from "@/lib/session";
import { supabaseAdmin, supabaseServer } from "@/lib/supabase/server";
import { createBook, updateProfile } from "./actions";

export default async function Dashboard({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  const profile = await requireProfile(lang);
  const supabase = await supabaseServer();
  const { data: books } = await supabase.from("books").select("*").eq("author_id", profile.id).order("created_at", { ascending: false });
  // Orders are server-only tables; read this author's own sales with the service role.
  const { data: sales } = await supabaseAdmin()
    .from("order_items")
    .select("quantity, author_earnings_cents, orders!inner(status)")
    .eq("author_id", profile.id)
    .neq("orders.status", "pending");
  const copies = (sales ?? []).reduce((n, s) => n + s.quantity, 0);
  const earnings = (sales ?? []).reduce((n, s) => n + s.author_earnings_cents, 0);

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-3xl font-bold">{t.dashboard.title}</h1>
        <div id="sales" className="flex gap-6 text-sm">
          <div>
            <div className="text-muted">{t.dashboard.sales}</div>
            <div className="text-xl font-semibold">{copies}</div>
          </div>
          <div>
            <div className="text-muted">{t.dashboard.earnings}</div>
            <div className="text-xl font-semibold">{formatPrice(earnings)}</div>
          </div>
        </div>
      </div>

      <section className="space-y-2">
        {(books as Book[] | null)?.length ? (
          (books as Book[]).map((b) => (
            <Link key={b.id} href={`/${lang}/dashboard/books/${b.id}`} className="panel flex items-center justify-between gap-4 hover:border-accent">
              <span className="font-medium">{b.title}</span>
              <span className="text-sm text-muted">{t.status[b.status]}</span>
            </Link>
          ))
        ) : (
          <p className="text-muted">{t.dashboard.empty}</p>
        )}
      </section>

      <section className="panel">
        <h2 className="text-xl font-bold">{t.dashboard.newBook}</h2>
        <form action={createBook.bind(null, lang)} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="label sm:col-span-2">
            {t.editor.title}
            <input name="title" required maxLength={200} className="field" />
          </label>
          <label className="label">
            {t.editor.language}
            <select name="language" defaultValue="el" className="field">
              {BOOK_LANGUAGES.map((l) => (
                <option key={l} value={l}>
                  {t.languages[l]}
                </option>
              ))}
            </select>
          </label>
          <label className="label">
            {t.editor.category}
            <select name="category" defaultValue="other" className="field">
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {t.categories[c]}
                </option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-2">
            <button className="btn">{t.editor.create}</button>
          </div>
        </form>
      </section>

      <section className="panel">
        <h2 className="text-xl font-bold">{t.dashboard.profile}</h2>
        <form action={updateProfile.bind(null, lang)} className="mt-4 grid gap-4">
          <label className="label">
            {t.dashboard.displayName}
            <input name="display_name" required defaultValue={profile.display_name} className="field" />
          </label>
          <label className="label">
            {t.dashboard.handle}
            <input name="handle" defaultValue={profile.handle ?? ""} pattern="[a-z0-9-]{3,40}" className="field" />
          </label>
          <label className="label">
            {t.dashboard.bio}
            <textarea name="bio" rows={4} defaultValue={profile.bio} className="field" />
          </label>
          <div>
            <button className="btn">{t.dashboard.save}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
