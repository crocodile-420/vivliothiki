"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/i18n/config";
import { Icon } from "./icons";

const NAMES: Record<Locale, string> = { el: "Ελληνικά", en: "English" };

// Switches language on the same page, so a reader on a book doesn't land back on the home page.
export function LangSwitch({ lang }: { lang: Locale }) {
  const other: Locale = lang === "el" ? "en" : "el";
  const pathname = usePathname() ?? `/${lang}`;
  const href = pathname.replace(new RegExp(`^/${lang}(?=/|$)`), `/${other}`);
  return (
    <Link href={href} className="lang-switch" hrefLang={other} lang={other}>
      <Icon name="globe" size={16} />
      {NAMES[other]}
    </Link>
  );
}
