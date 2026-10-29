import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { currentProfile } from "@/lib/session";

export async function Header({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const profile = await currentProfile();
  const other: Locale = lang === "el" ? "en" : "el";
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-4">
        <Link href={`/${lang}`} className="font-serif text-xl font-bold">
          {t.brand}
        </Link>
        <nav className="flex flex-wrap items-center gap-4 text-sm">
          <Link href={`/${lang}/books`}>{t.nav.books}</Link>
          {profile ? (
            <>
              <Link href={`/${lang}/dashboard`}>{t.nav.dashboard}</Link>
              {profile.is_admin && <Link href={`/${lang}/admin`}>{t.nav.admin}</Link>}
              <form action="/auth/signout" method="post">
                <button className="text-muted hover:text-ink">{t.nav.logout}</button>
              </form>
            </>
          ) : (
            <Link href={`/${lang}/login`} className="btn">
              {t.nav.publish}
            </Link>
          )}
          <Link href={`/${other}`} className="uppercase text-muted" hrefLang={other}>
            {other}
          </Link>
        </nav>
      </div>
    </header>
  );
}
