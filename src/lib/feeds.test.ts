import { describe, expect, it } from "vitest";
import { channel, channelFits, effectiveStatus } from "./channels";
import { bestpriceFeed, feedProducts, googleFeed, skroutzFeed } from "./feeds";

const book = {
  slug: "papa-tony-ab12cd",
  title: "Οι Ιστορίες του Papa Tony",
  subtitle: "",
  description: "Ιστορίες για παιδιά & γονείς <3",
  language: "el" as const,
  category: "children" as const,
  author: "Yanni",
  image: "https://example.supabase.co/storage/v1/object/public/covers/u/c.jpg",
  editions: [
    { id: "e1", format: "paperback" as const, price_cents: 1990, isbn: "978-618-00-0000-0", stock_quantity: 0 },
    { id: "e2", format: "ebook" as const, price_cents: 699, isbn: null, stock_quantity: 0 },
  ],
};
const opts = { siteUrl: "https://vivliothiki.vercel.app", formatLabel: (f: string) => f, categoryLabel: () => "Παιδικά" };

describe("feedProducts", () => {
  it("lists one product per edition the channel sells", () => {
    expect(feedProducts([book], { ...opts, formats: "all" }).map((p) => p.id)).toEqual(["e1", "e2"]);
    expect(feedProducts([book], { ...opts, formats: "print" }).map((p) => p.id)).toEqual(["e1"]);
    expect(feedProducts([book], { ...opts, formats: "ebook" }).map((p) => p.id)).toEqual(["e2"]);
  });

  it("links to the book page in the book's language and skips books without a cover", () => {
    const [p] = feedProducts([book], { ...opts, formats: "print" });
    expect(p.link).toBe("https://vivliothiki.vercel.app/el/books/papa-tony-ab12cd");
    expect(feedProducts([{ ...book, image: null }], { ...opts, formats: "all" })).toEqual([]);
  });

  it("drops an invalid ISBN rather than sending it as a GTIN", () => {
    const [p] = feedProducts([book], { ...opts, formats: "print" });
    expect(p.isbn).toBeNull(); // the check digit of 978-618-00-0000-0 is wrong
    const [q] = feedProducts([{ ...book, editions: [{ ...book.editions[0], isbn: "978-0-306-40615-7" }] }], { ...opts, formats: "print" });
    expect(q.isbn).toBe("9780306406157");
  });
});

describe("feeds", () => {
  const products = feedProducts([book], { ...opts, formats: "print" });

  it("escapes text in the Google feed", () => {
    const xml = googleFeed(products, { title: "Vivliothiki Books", siteUrl: opts.siteUrl });
    expect(xml).toContain("<g:price>19.90 EUR</g:price>");
    expect(xml).toContain("παιδιά &amp; γονείς &lt;3");
    expect(xml).toContain("<g:identifier_exists>no</g:identifier_exists>");
  });

  it("writes Skroutz and BestPrice prices with VAT and Greek delivery times", () => {
    const now = new Date("2026-10-29T10:00:00Z");
    const skroutz = skroutzFeed(products, now);
    expect(skroutz).toContain("<created_at>2026-10-29 10:00</created_at>");
    expect(skroutz).toContain("<price_with_vat>19.90</price_with_vat><vat>6.00</vat>");
    expect(skroutz).toContain("Παράδοση σε 4 - 10 ημέρες");
    expect(bestpriceFeed(products, now)).toContain("<price>19.90</price>");
  });

  it("keeps CDATA sections closed", () => {
    const xml = skroutzFeed(feedProducts([{ ...book, description: "a]]>b" }], { ...opts, formats: "print" }));
    expect(xml).toContain("<![CDATA[a]]]]><![CDATA[>b]]>");
  });
});

describe("channels", () => {
  it("matches channels to the book's formats", () => {
    expect(channelFits(channel("amazon")!, ["ebook"])).toBe(false);
    expect(channelFits(channel("amazon")!, ["paperback", "ebook"])).toBe(true);
    expect(channelFits(channel("kobo")!, ["hardcover"])).toBe(false);
    expect(channelFits(channel("google_shopping")!, [])).toBe(false);
  });

  it("treats a feed request as live and a marketplace request as pending", () => {
    expect(effectiveStatus(channel("skroutz")!, "requested")).toBe("listed");
    expect(effectiveStatus(channel("amazon")!, "requested")).toBe("requested");
  });
});
