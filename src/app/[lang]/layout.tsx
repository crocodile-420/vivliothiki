import type { Metadata } from "next";
import localFont from "next/font/local";
import { notFound } from "next/navigation";
import "../globals.css";
import "../site.css";
import { Header } from "@/components/Header";
import { isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params;
  const t = getDictionary(isLocale(lang) ? lang : "el");
  return { title: { default: t.brand, template: `%s · ${t.brand}` }, description: t.tagline };
}

const literata = localFont({
  src: [
    { path: "../../../public/fonts/Literata_400Regular.ttf", weight: "400" },
    { path: "../../../public/fonts/Literata_700Bold.ttf", weight: "700" },
  ],
  variable: "--font-literata",
  display: "swap",
});

// Every page shows the signed-in user's header and live catalog data.
export const dynamic = "force-dynamic";

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDictionary(lang);
  return (
    <html lang={lang} className={literata.variable}>
      <body className="min-h-screen antialiased">
        <Header lang={lang} />
        <main className="site-wrap py-8">{children}</main>
        <footer className="mt-16 border-t border-line">
          <div className="site-wrap flex flex-wrap items-center justify-between gap-4 py-6 text-sm text-muted">
            <span>© {new Date().getFullYear()} {t.brand}</span>
            <span className="italic">{t.tagline}</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
