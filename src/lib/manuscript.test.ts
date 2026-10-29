import { readFileSync } from "node:fs";
import JSZip from "jszip";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { PT_PER_INCH } from "./cover";
import { buildEpub } from "./epub";
import { buildInteriorPdf } from "./interiorPdf";
import { INTERIOR_TEMPLATES } from "./interiorTemplates";
import { parseManuscriptHtml, plain } from "./manuscript";

const font = (f: string) => new Uint8Array(readFileSync(`public/fonts/${f}`));
const fontsFor = (key: keyof typeof INTERIOR_TEMPLATES) => {
  const f = INTERIOR_TEMPLATES[key].fonts;
  return { regular: font(f.regular), italic: f.italic ? font(f.italic) : undefined, bold: font(f.bold), display: font(f.display) };
};

describe("parseManuscriptHtml", () => {
  it("reads headings, styled runs, lists, scene breaks and centered lines", () => {
    const m = parseManuscriptHtml(
      '<p style="text-align: center">Για τον παππού</p><h1>Κεφάλαιο 1</h1><p>Ο Τόνι <strong>έτρεξε</strong> &amp; <em>γέλασε</em>.</p><p>* * *</p><h2>Ενότητα</h2><ul><li>ένα</li><li>δύο</li></ul><ol><li>πρώτο</li></ol><h1>Κεφάλαιο 2</h1><p>Τέλος<sup><a href="#n1">1</a></sup></p>',
    );
    expect(m.chapters).toHaveLength(3);
    expect(m.chapters[0].title).toEqual([]);
    expect(m.chapters[0].blocks[0]).toMatchObject({ type: "paragraph", align: "center" });
    const ch1 = m.chapters[1];
    expect(plain(ch1.title)).toBe("Κεφάλαιο 1");
    expect(ch1.blocks[0]).toEqual({ type: "paragraph", runs: [{ text: "Ο Τόνι " }, { text: "έτρεξε", bold: true }, { text: " & " }, { text: "γέλασε", italic: true }, { text: "." }] });
    expect(ch1.blocks.map((b) => b.type)).toEqual(["paragraph", "break", "heading", "item", "item", "item"]);
    expect(ch1.blocks.filter((b) => b.type === "item").map((b) => (b as { marker: string }).marker)).toEqual(["•", "•", "1."]);
    const end = m.chapters[2].blocks[0];
    expect("runs" in end && plain(end.runs)).toBe("Τέλος"); // footnote marks are dropped
  });

  it("uses Heading 2 for chapters when there is no Heading 1", () => {
    const m = parseManuscriptHtml("<h2>Α</h2><p>x</p><h3>υπο</h3><h2>Β</h2><p>y</p>");
    expect(m.chapters.map((c) => plain(c.title))).toEqual(["Α", "Β"]);
    expect(m.chapters[0].blocks[1]).toMatchObject({ type: "heading", level: 3 });
  });
});

describe("Word file to print interior and EPUB", async () => {
  const { value: html } = await mammoth.convertToHtml({ buffer: readFileSync("src/lib/fixtures/sample.docx") });
  const manuscript = parseManuscriptHtml(html);

  it("finds the chapters and the picture", () => {
    expect(manuscript.chapters.map((c) => plain(c.title))).toEqual(["", "Κεφάλαιο 1: Το λιμάνι", "Κεφάλαιο 2: Το λιμάνι", "Κεφάλαιο 3: Το λιμάνι"]);
    expect(manuscript.chapters[2].blocks.some((b) => b.type === "image")).toBe(true);
    expect(manuscript.words).toBeGreaterThan(1500);
  });

  for (const template of ["classic", "modern", "kids"] as const) {
    it(`typesets a ${template} interior at 6×9 in, with an even page count`, async () => {
      const trim = { widthPt: 6 * PT_PER_INCH, heightPt: 9 * PT_PER_INCH };
      const { pdf, pageCount } = await buildInteriorPdf({ manuscript, template, trim, title: "Οι Ιστορίες του Papa Tony", author: "Yanni", lang: "el", isbn: "978-0-306-40615-7", fonts: fontsFor(template), minPages: 32 });
      const doc = await PDFDocument.load(pdf);
      expect(doc.getPageCount()).toBe(pageCount);
      expect(pageCount % 2).toBe(0);
      expect(pageCount).toBeGreaterThanOrEqual(32);
      const { width, height } = doc.getPage(0).getSize();
      expect([Math.round(width), Math.round(height)]).toEqual([432, 648]);
    });
  }

  it("starts classic chapters on right-hand (odd) pages", async () => {
    const trim = { widthPt: 6 * PT_PER_INCH, heightPt: 9 * PT_PER_INCH };
    const short = parseManuscriptHtml("<h1>Α</h1><p>ένα</p><h1>Β</h1><p>δύο</p>");
    const { pageCount } = await buildInteriorPdf({ manuscript: short, template: "classic", trim, title: "Τ", author: "Σ", lang: "el", fonts: fontsFor("classic") });
    // title, copyright, A (p3), blank (p4), B (p5), blank to make it even
    expect(pageCount).toBe(6);
  });

  it("packages an EPUB with the mimetype first and every chapter in the spine", async () => {
    const epub = await buildEpub({ manuscript, title: "Οι Ιστορίες του Papa Tony", author: "Yanni", lang: "el", identifier: "00000000-0000-4000-8000-000000000000" });
    const zip = await JSZip.loadAsync(epub);
    expect(Object.keys(zip.files)[0]).toBe("mimetype");
    expect(new TextDecoder().decode(epub.slice(30, 38))).toBe("mimetype");
    const opf = await zip.file("OEBPS/content.opf")!.async("string");
    expect(opf.match(/<itemref /g)).toHaveLength(1 + manuscript.chapters.length);
    expect(opf).toContain('properties="nav"');
    const ch2 = await zip.file("OEBPS/chapter-003.xhtml")!.async("string");
    expect(ch2).toContain("<h1>Κεφάλαιο 2: Το λιμάνι</h1>");
    expect(ch2).toMatch(/<img src="images\/img-1\.png"/);
    expect(zip.file("OEBPS/images/img-1.png")).not.toBeNull();
  });
});
