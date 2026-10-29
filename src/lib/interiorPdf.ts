// Typesets a manuscript into a print-ready interior PDF at the book's trim size: title and
// copyright pages, chapters (on right-hand pages where the design calls for it), running heads
// and page numbers. The page count it returns is what printing is priced on.
import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { PT_PER_INCH } from "./cover";
import { INTERIOR_TEMPLATES, type InteriorTemplateKey } from "./interiorTemplates";
import { type Block, dataUri, type Manuscript, plain, type Run } from "./manuscript";

export interface InteriorInput {
  manuscript: Manuscript;
  template: InteriorTemplateKey;
  trim: { widthPt: number; heightPt: number };
  title: string;
  subtitle?: string;
  author: string;
  isbn?: string;
  lang: "el" | "en";
  year?: number;
  minPages?: number; // printers need a minimum page count for some bindings; blank pages fill up to it
  fonts: { regular: Uint8Array; italic?: Uint8Array; bold: Uint8Array; display: Uint8Array };
}

export interface InteriorResult {
  pdf: Uint8Array;
  pageCount: number;
}

const INK = rgb(0.1, 0.09, 0.08);
const IMPRINT = "Vivliothiki Books";
const COPY = {
  el: { rights: "Με την επιφύλαξη παντός δικαιώματος.", edition: "Πρώτη έκδοση" },
  en: { rights: "All rights reserved.", edition: "First edition" },
};

interface Piece {
  text: string;
  font: PDFFont;
  slant: boolean;
}
type Word = Piece[];

// Splits styled runs into words, each made of one or more styled pieces ("bo**ld**" is one word).
export function toWords(runs: Run[], pick: (r: Run) => { font: PDFFont; slant: boolean }): Word[] {
  const words: Word[] = [];
  let cur: Word = [];
  for (const r of runs) {
    const style = pick(r);
    const parts = r.text.split(/( +)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^ +$/.test(part)) {
        if (cur.length) words.push(cur);
        cur = [];
      } else cur.push({ text: part, ...style });
    }
  }
  if (cur.length) words.push(cur);
  return words;
}

const wordWidth = (w: Word, size: number) => w.reduce((n, p) => n + p.font.widthOfTextAtSize(p.text, size), 0);

// Greedy line breaking. A word wider than the line is cut between letters.
export function breakLines(words: Word[], size: number, width: number, firstIndent: number, space: number): Word[][] {
  const lines: Word[][] = [];
  let line: Word[] = [];
  let used = 0;
  const avail = () => width - (lines.length === 0 ? firstIndent : 0);
  const queue = [...words];
  while (queue.length) {
    const w = queue.shift()!;
    const ww = wordWidth(w, size);
    const need = line.length ? used + space + ww : ww;
    if (need <= avail() + 0.01) {
      line.push(w);
      used = need;
      continue;
    }
    if (line.length) {
      lines.push(line);
      line = [];
      used = 0;
      queue.unshift(w);
      continue;
    }
    // Alone and still too wide: cut it.
    const head: Word = [], rest: Word = [];
    let room = avail(), cut = false;
    for (const p of w) {
      if (cut) {
        rest.push(p);
        continue;
      }
      let take = "";
      for (const ch of p.text) {
        const cw = p.font.widthOfTextAtSize(take + ch, size);
        if (cw > room && (take || head.length)) break;
        take += ch;
      }
      if (take) head.push({ ...p, text: take });
      room -= p.font.widthOfTextAtSize(take, size);
      if (take.length < p.text.length) {
        rest.push({ ...p, text: p.text.slice(take.length) });
        cut = true;
      }
    }
    lines.push([head]);
    if (rest.length) queue.unshift(rest);
  }
  if (line.length) lines.push(line);
  return lines;
}

export async function buildInteriorPdf(input: InteriorInput): Promise<InteriorResult> {
  const t = INTERIOR_TEMPLATES[input.template];
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  // Fonts are embedded whole: subsetting drops glyphs in the larger ones (see coverPdf).
  const regular = await doc.embedFont(input.fonts.regular, { subset: false });
  const italic = input.fonts.italic ? await doc.embedFont(input.fonts.italic, { subset: false }) : null;
  const bold = await doc.embedFont(input.fonts.bold, { subset: false });
  const display = input.fonts.display === input.fonts.bold ? bold : await doc.embedFont(input.fonts.display, { subset: false });
  doc.setTitle(input.title);
  doc.setAuthor(input.author);
  doc.setProducer(IMPRINT);

  const { widthPt: W, heightPt: H } = input.trim;
  const scale = 1 + (W / (6 * PT_PER_INCH) - 1) * 0.6;
  const size = t.size * scale;
  const lineH = size * t.leading;
  const m = { top: 0.75 * PT_PER_INCH * scale, bottom: 0.8 * PT_PER_INCH * scale, inside: 0.8 * PT_PER_INCH, outside: 0.6 * PT_PER_INCH * scale };
  const textW = W - m.inside - m.outside;
  const textH = H - m.top - m.bottom;
  const space = regular.widthOfTextAtSize(" ", size);
  const pick = (r: Run) => (r.bold ? { font: bold, slant: !!r.italic && !italic } : r.italic ? { font: italic ?? regular, slant: !italic } : { font: regular, slant: false });

  type Kind = "front" | "blank" | "opening" | "body";
  const pages: { page: PDFPage; kind: Kind }[] = [];
  let page!: PDFPage;
  let y = 0; // distance from the top of the page to the next baseline's top
  let x0 = 0;
  const addPage = (kind: Kind) => {
    page = doc.addPage([W, H]);
    pages.push({ page, kind });
    x0 = pages.length % 2 === 1 ? m.inside : m.outside; // odd page numbers are right-hand pages
    y = m.top;
  };
  const room = () => H - m.bottom - y;
  const baseline = () => H - y - size * 0.8;

  const drawPieces = (pieces: Piece[], x: number, yy: number, sz: number) => {
    for (const p of pieces) {
      page.drawText(p.text, { x, y: yy, size: sz, font: p.font, color: INK, ...(p.slant && { ySkew: degrees(12) }) });
      x += p.font.widthOfTextAtSize(p.text, sz);
    }
    return x;
  };

  // Draws broken lines; justified lines spread their spaces, the last line stays natural.
  const drawLines = (lines: Word[][], o: { indent: number; align: "left" | "center" | "justify"; sz: number; lead: number; hang?: number }) => {
    lines.forEach((line, i) => {
      const indent = i === 0 ? o.indent : (o.hang ?? 0);
      const avail = textW - indent;
      const natural = line.reduce((n, w) => n + wordWidth(w, o.sz), 0);
      const sp = space * (o.sz / size);
      let gap = sp;
      let x = x0 + indent;
      const last = i === lines.length - 1;
      if (o.align === "justify" && !last && line.length > 1) {
        const g = (avail - natural) / (line.length - 1);
        if (g < sp * 3) gap = g; // a line with too few words stays ragged rather than gappy
      } else if (o.align === "center") x += (avail - natural - sp * (line.length - 1)) / 2;
      const yy = H - y - o.sz * 0.8;
      line.forEach((w, j) => {
        x = drawPieces(w, x, yy, o.sz);
        if (j < line.length - 1) x += gap;
      });
      y += o.lead;
    });
  };

  const paragraph = (runs: Run[], o: { indent: number; align: "left" | "center" | "justify"; hang?: number; marker?: string }) => {
    const lines = breakLines(toWords(runs, pick), size, textW - (o.hang ?? 0), o.indent - (o.hang ?? 0), space);
    let i = 0;
    while (i < lines.length) {
      const fit = Math.floor((room() + 0.01) / lineH);
      // Never leave a paragraph's first line alone at the foot of a page.
      if (fit <= 0 || (i === 0 && fit === 1 && lines.length > 1)) {
        addPage("body");
        continue;
      }
      // Nor its last line alone at the top of the next one.
      const take = lines.length - (i + fit) === 1 && fit > 2 ? fit - 1 : fit;
      const chunk = lines.slice(i, i + take);
      if (i === 0 && o.marker) page.drawText(o.marker, { x: x0 + (o.hang ?? 0) - regular.widthOfTextAtSize(`${o.marker} `, size), y: baseline(), size, font: regular, color: INK });
      // Lines after the first are already shortened by the hang, so draw them shifted.
      drawLines(chunk, { indent: i === 0 ? o.indent : (o.hang ?? 0), align: o.align, sz: size, lead: lineH, hang: o.hang });
      i += chunk.length;
    }
  };

  const heading = (runs: Run[], level: 2 | 3) => {
    const sz = size * (level === 2 ? 1.3 : 1.12);
    const words = toWords(runs.map((r) => ({ ...r, bold: true })), () => ({ font: display, slant: false }));
    const lines = breakLines(words, sz, textW, 0, space * (sz / size));
    const before = y > m.top + 1 ? lineH * 1.2 : 0;
    // Keep a heading with at least two lines of what follows.
    if (room() < before + lines.length * sz * 1.25 + lineH * 2) addPage("body");
    else y += before;
    drawLines(lines, { indent: 0, align: t.headingAlign, sz, lead: sz * 1.25 });
    y += lineH * 0.5;
  };

  const image = async (src: string) => {
    const data = dataUri(src);
    if (!data) return;
    let img;
    try {
      img = /png/.test(data.mime) ? await doc.embedPng(data.bytes) : /jpe?g/.test(data.mime) ? await doc.embedJpg(data.bytes) : null;
    } catch {
      img = null;
    }
    if (!img) return; // other formats (EMF, GIF) are skipped
    const s = Math.min(textW / img.width, (textH * t.imageMaxHeight) / img.height, 1.5);
    const w = img.width * s, h = img.height * s;
    if (room() < h + lineH * 0.5) addPage("body");
    else if (y > m.top + 1) y += lineH * 0.4;
    page.drawImage(img, { x: x0 + (textW - w) / 2, y: H - y - h, width: w, height: h });
    y += h + lineH * 0.6;
  };

  // ---- front matter: title page, then copyright page
  addPage("front");
  {
    const tsz = size * 2.4;
    const words = toWords([{ text: input.title }], () => ({ font: display, slant: false }));
    const lines = breakLines(words, tsz, textW, 0, display.widthOfTextAtSize(" ", tsz));
    y = m.top + textH * 0.22;
    drawLines(lines, { indent: 0, align: "center", sz: tsz, lead: tsz * 1.15 });
    if (input.subtitle) {
      y += size;
      drawLines(breakLines(toWords([{ text: input.subtitle }], () => ({ font: italic ?? regular, slant: !italic })), size * 1.2, textW, 0, space * 1.2), { indent: 0, align: "center", sz: size * 1.2, lead: size * 1.6 });
    }
    y += size * 2.5;
    drawLines(breakLines(toWords([{ text: input.author }], () => ({ font: regular, slant: false })), size * 1.3, textW, 0, space * 1.3), { indent: 0, align: "center", sz: size * 1.3, lead: size * 1.6 });
    const iw = regular.widthOfTextAtSize(IMPRINT.toUpperCase(), size * 0.8);
    page.drawText(IMPRINT.toUpperCase(), { x: x0 + (textW - iw) / 2, y: m.bottom, size: size * 0.8, font: regular, color: INK });
  }
  addPage("front");
  {
    const c = COPY[input.lang];
    const lines = [`© ${input.year ?? new Date().getFullYear()} ${input.author}`, input.isbn ? `ISBN ${input.isbn}` : "", `${c.edition}, ${IMPRINT}`, c.rights].filter(Boolean);
    const sz = size * 0.8;
    lines.forEach((l, i) => page.drawText(l, { x: x0, y: m.bottom + (lines.length - 1 - i) * sz * 1.5, size: sz, font: regular, color: INK }));
  }

  // ---- chapters
  for (const [ci, ch] of input.manuscript.chapters.entries()) {
    if (t.chapterOnRight && pages.length % 2 === 1) addPage("blank");
    addPage("opening");
    if (ch.title.length) {
      const sz = size * 1.9;
      const words = toWords(ch.title.map((r) => ({ ...r, bold: true })), () => ({ font: display, slant: false }));
      const lines = breakLines(words, sz, textW, 0, display.widthOfTextAtSize(" ", sz));
      y = m.top + textH * t.chapterDrop;
      drawLines(lines, { indent: 0, align: t.headingAlign, sz, lead: sz * 1.2 });
      // A short rule under the title.
      const rw = Math.min(textW * 0.18, 60);
      const rx = t.headingAlign === "center" ? x0 + (textW - rw) / 2 : x0;
      page.drawLine({ start: { x: rx, y: H - y - sz * 0.1 }, end: { x: rx + rw, y: H - y - sz * 0.1 }, thickness: 0.8, color: INK });
      y += lineH * 2;
    }
    // A few untitled lines before the first chapter are a dedication: centered, in italics, a third down.
    const short = ch.blocks.every((b) => b.type === "paragraph") && ch.blocks.reduce((n, b) => n + ("runs" in b ? plain(b.runs).split(/\s+/).length : 0), 0) <= 60;
    if (ci === 0 && !ch.title.length && short && ch.blocks.length) {
      y = m.top + textH * 0.3;
      for (const b of ch.blocks) {
        if (b.type !== "paragraph") continue;
        paragraph(b.runs.map((r) => ({ ...r, italic: true })), { indent: 0, align: "center" });
        y += lineH * 0.5;
      }
      continue;
    }
    let after = true; // the first paragraph after a title, heading or break has no indent
    for (const b of ch.blocks as Block[]) {
      if (b.type === "paragraph") {
        const center = b.align === "center";
        paragraph(b.runs, { indent: center || after ? 0 : t.indent * size, align: center ? "center" : t.justify ? "justify" : "left" });
        if (t.paragraphGap) y += lineH * t.paragraphGap;
        after = false;
      } else if (b.type === "heading") {
        heading(b.runs, b.level === 1 ? 2 : b.level);
        after = true;
      } else if (b.type === "item") {
        paragraph(b.runs, { indent: size * 1.6, hang: size * 1.6, align: "left", marker: b.marker });
        y += lineH * 0.2;
      } else if (b.type === "break") {
        if (room() < lineH * 3) addPage("body");
        y += lineH * 0.5;
        const mark = "*   *   *";
        page.drawText(mark, { x: x0 + (textW - regular.widthOfTextAtSize(mark, size)) / 2, y: baseline(), size, font: regular, color: INK });
        y += lineH * 1.5;
        after = true;
      } else if (b.type === "image") {
        await image(b.src);
        after = true;
      }
    }
  }

  // ---- fill to the printer's minimum and to an even count
  while (pages.length < (input.minPages ?? 0) || pages.length % 2) addPage("blank");

  // ---- running heads and page numbers on body pages
  const hsz = size * 0.78;
  pages.forEach(({ page: p, kind }, i) => {
    if (kind === "front" || kind === "blank") return;
    const right = i % 2 === 0;
    const px = right ? m.inside : m.outside;
    const num = String(i + 1);
    p.drawText(num, { x: px + (textW - regular.widthOfTextAtSize(num, hsz)) / 2, y: m.bottom * 0.5, size: hsz, font: regular, color: INK });
    if (kind === "opening") return;
    const head = (right ? input.title : input.author).toUpperCase();
    const tracking = hsz * 0.08;
    let w = [...head].reduce((n, ch) => n + regular.widthOfTextAtSize(ch, hsz) + tracking, -tracking);
    const fitted = w > textW ? head.slice(0, Math.floor((head.length * textW) / w) - 1) + "…" : head;
    w = [...fitted].reduce((n, ch) => n + regular.widthOfTextAtSize(ch, hsz) + tracking, -tracking);
    let x = px + (textW - w) / 2;
    for (const ch of fitted) {
      p.drawText(ch, { x, y: H - m.top * 0.6, size: hsz, font: regular, color: INK });
      x += regular.widthOfTextAtSize(ch, hsz) + tracking;
    }
  });

  return { pdf: await doc.save(), pageCount: pages.length };
}
