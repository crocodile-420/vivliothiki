// Product feeds that shopping sites read to list our books. Each product links back to the book's
// page here, so the sale (and the author's earnings) happen on Vivliothiki.
import type { Book, EditionFormat } from "./books";
import { normalizeIsbn13 } from "./ean13";
import { GREEK_BOOK_VAT_PERCENT } from "./pricing";

export interface FeedProduct {
  id: string;
  title: string;
  description: string;
  author: string;
  category: string;
  format: EditionFormat;
  formatLabel: string;
  priceCents: number;
  isbn: string | null;
  link: string;
  image: string;
  inStock: boolean;
}

// One product per edition of a published book, for the formats the channel sells.
export function feedProducts(
  books: (Pick<Book, "slug" | "title" | "subtitle" | "description" | "language" | "category"> & {
    author: string;
    image: string | null;
    editions: { id: string; format: EditionFormat; price_cents: number; isbn: string | null; stock_quantity: number }[];
  })[],
  opts: { siteUrl: string; formats: "print" | "ebook" | "all"; formatLabel: (f: EditionFormat) => string; categoryLabel: (c: string) => string },
): FeedProduct[] {
  return books.flatMap((b) => {
    // Shopping sites refuse products without a picture.
    if (!b.image) return [];
    const lang = b.language === "el" ? "el" : "en";
    return b.editions
      .filter((e) => opts.formats === "all" || (opts.formats === "ebook") === (e.format === "ebook"))
      .map((e) => ({
        id: e.id,
        title: [b.title, b.subtitle].filter(Boolean).join(": "),
        description: b.description,
        author: b.author,
        category: opts.categoryLabel(b.category),
        format: e.format,
        formatLabel: opts.formatLabel(e.format),
        priceCents: e.price_cents,
        isbn: e.isbn ? normalizeIsbn13(e.isbn) : null,
        link: `${opts.siteUrl}/${lang}/books/${b.slug}`,
        image: b.image!,
        inStock: e.stock_quantity > 0,
      }));
  });
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// CDATA can't contain "]]>", so split it across two sections.
const cdata = (s: string) => `<![CDATA[${s.replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;
const euros = (cents: number) => (cents / 100).toFixed(2);

// Google Merchant Center. Meta's catalog (Facebook and Instagram shops) reads the same format.
export function googleFeed(products: FeedProduct[], meta: { title: string; siteUrl: string }): string {
  const items = products.map((p) =>
    [
      "<item>",
      `<g:id>${esc(p.id)}</g:id>`,
      `<title>${esc(`${p.title} (${p.formatLabel})`)}</title>`,
      `<description>${esc(p.description || p.title)}</description>`,
      `<link>${esc(p.link)}</link>`,
      `<g:image_link>${esc(p.image)}</g:image_link>`,
      `<g:price>${euros(p.priceCents)} EUR</g:price>`,
      // Print copies are made to order, so they can always be bought.
      "<g:availability>in_stock</g:availability>",
      "<g:condition>new</g:condition>",
      "<g:google_product_category>784</g:google_product_category>",
      `<g:product_type>${esc(p.category)}</g:product_type>`,
      `<g:brand>${esc(p.author)}</g:brand>`,
      p.isbn ? `<g:gtin>${p.isbn}</g:gtin>` : "<g:identifier_exists>no</g:identifier_exists>",
      "</item>",
    ].join(""),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(meta.title)}</title><link>${esc(meta.siteUrl)}</link><description>${esc(meta.title)}</description>${items.join("\n")}</channel></rss>\n`;
}

const greekDelivery = (inStock: boolean) => (inStock ? "Παράδοση σε 1 - 3 ημέρες" : "Παράδοση σε 4 - 10 ημέρες");
const feedDate = (d: Date) => d.toISOString().slice(0, 16).replace("T", " ");

// Skroutz's XML feed (print books only; Skroutz doesn't list ebooks).
export function skroutzFeed(products: FeedProduct[], now = new Date()): string {
  const items = products.map((p) =>
    [
      "<product>",
      `<id>${esc(p.id)}</id>`,
      `<name>${cdata(`${p.title} (${p.formatLabel})`)}</name>`,
      `<link>${cdata(p.link)}</link>`,
      `<image>${cdata(p.image)}</image>`,
      `<category>${cdata(`Βιβλία > ${p.category}`)}</category>`,
      `<price_with_vat>${euros(p.priceCents)}</price_with_vat>`,
      `<vat>${GREEK_BOOK_VAT_PERCENT.toFixed(2)}</vat>`,
      `<manufacturer>${cdata("Vivliothiki Books")}</manufacturer>`,
      `<mpn>${esc(p.id)}</mpn>`,
      p.isbn ? `<ean>${p.isbn}</ean><isbn>${p.isbn}</isbn>` : "",
      `<author>${cdata(p.author)}</author>`,
      `<availability>${greekDelivery(p.inStock)}</availability>`,
      `<description>${cdata(p.description)}</description>`,
      "</product>",
    ].join(""),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<mywebstore><created_at>${feedDate(now)}</created_at><products>${items.join("\n")}</products></mywebstore>\n`;
}

// BestPrice's XML feed (print books only).
export function bestpriceFeed(products: FeedProduct[], now = new Date()): string {
  const items = products.map((p) =>
    [
      "<product>",
      `<productId>${esc(p.id)}</productId>`,
      `<title>${cdata(`${p.title} (${p.formatLabel})`)}</title>`,
      `<productURL>${cdata(p.link)}</productURL>`,
      `<imageURL>${cdata(p.image)}</imageURL>`,
      `<category_path>${cdata(`Βιβλία > ${p.category}`)}</category_path>`,
      `<price>${euros(p.priceCents)}</price>`,
      `<brand>${cdata("Vivliothiki Books")}</brand>`,
      p.isbn ? `<EAN>${p.isbn}</EAN><ISBN>${p.isbn}</ISBN>` : "",
      `<author>${cdata(p.author)}</author>`,
      `<availability>${greekDelivery(p.inStock)}</availability>`,
      `<stock>Y</stock>`,
      `<description>${cdata(p.description)}</description>`,
      "</product>",
    ].join(""),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<store><date>${feedDate(now)}</date><products>${items.join("\n")}</products></store>\n`;
}
