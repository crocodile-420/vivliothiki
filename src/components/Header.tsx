import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { siteCopy } from "@/i18n/site";
import { currentProfile } from "@/lib/session";
import { Icon } from "./icons";
import { LangSwitch } from "./LangSwitch";
import { MegaMenu } from "./MegaMenu";

export async function Header({ lang }: { lang: Locale }) {
  const t = getDictionary(lang);
  const copy = siteCopy(lang);
  const profile = await currentProfile();
  return (
    <>
      <div className="utility">
        <div className="site-wrap utility-inner">
          {profile ? (
            <>
              <Link href={`/${lang}/dashboard`}>{copy.utility.books}</Link>
              <Link href={`/${lang}/dashboard#sales`}>{copy.utility.sales}</Link>
              {profile.is_admin && <Link href={`/${lang}/admin`}>{t.nav.admin}</Link>}
              <form action="/auth/signout" method="post">
                <button>{t.nav.logout}</button>
              </form>
            </>
          ) : (
            <Link href={`/${lang}/login`}>{copy.utility.login}</Link>
          )}
        </div>
      </div>
      <header className="site-header">
        <div className="site-wrap header-inner">
          <Link href={`/${lang}`} className="brand">
            {t.brand}
          </Link>
          <MegaMenu lang={lang} copy={copy} />
          <div className="head-actions">
            <Link className="icon-btn" href={`/${lang}/books`} aria-label={t.nav.books}>
              <Icon name="bag" />
            </Link>
            <Link href={`/${lang}/dashboard`} className="btn head-cta">
              {t.nav.publish}
            </Link>
            <LangSwitch lang={lang} />
          </div>
        </div>
      </header>
    </>
  );
}
