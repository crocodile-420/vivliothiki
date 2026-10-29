import fontkit from "@pdf-lib/fontkit";
import pako from "pako";
import { degrees, PDFDocument, type PDFFont, type PDFImage, type PDFPage, type RGB, rgb } from "pdf-lib";
import { type CoverSize, coverLayout, PT_PER_INCH, type Rect, wrapText } from "./cover";
import { COVER_TEMPLATES, type CoverTemplateKey, hexToRgb01, imageSlots } from "./coverTemplates";
import { encodeEan13, isGuardModule, normalizeIsbn13 } from "./ean13";

export interface CoverInput {
  size: CoverSize;
  template: CoverTemplateKey;
  title: string;
  subtitle?: string;
  author: string;
  backText: string;
  tagline?: string; // headline at the top of the back cover
  authorBio?: string;
  ageRange?: string; // badge on children's covers, e.g. "4-7"
  isbn?: string;
  background?: string;
  accent?: string;
  // JPEGs already cropped (and filtered) to imageSlots(), from the browser.
  frontImageJpeg?: Uint8Array;
  backImageJpeg?: Uint8Array;
  fonts: { display: Uint8Array; body: Uint8Array };
}

const color = (hex: string) => rgb(...hexToRgb01(hex));
const BLACK = rgb(0, 0, 0);
const WHITE = rgb(1, 1, 1);
const IMPRINT = "VIVLIOTHIKI BOOKS";

// fontkit's subsetter drops glyphs from fonts with very large glyph sets (Fira), so those are
// embedded whole. Smaller fonts are subset to keep the file light.
const SUBSET_SAFE = (font: Uint8Array) => font.byteLength < 300_000;

interface TextStyle {
  font: PDFFont;
  size: number;
  color: RGB;
  tracking?: number; // extra space between letters, in em
  shadow?: number; // opacity of a soft drop shadow
  outline?: { color: RGB; width: number };
}

function textWidth(text: string, s: Pick<TextStyle, "font" | "size" | "tracking">) {
  return s.font.widthOfTextAtSize(text, s.size) + (s.tracking ?? 0) * s.size * Math.max(0, [...text].length - 1);
}

function drawRun(page: PDFPage, text: string, x: number, y: number, s: TextStyle, rotate?: number) {
  const pass = (dx: number, dy: number, c: RGB, opacity = 1) => {
    if (!s.tracking) {
      page.drawText(text, { x: x + dx, y: y + dy, size: s.size, font: s.font, color: c, opacity, rotate: rotate === undefined ? undefined : degrees(rotate) });
      return;
    }
    let cx = x + dx;
    for (const ch of text) {
      page.drawText(ch, { x: cx, y: y + dy, size: s.size, font: s.font, color: c, opacity });
      cx += s.font.widthOfTextAtSize(ch, s.size) + s.tracking * s.size;
    }
  };
  if (s.shadow) {
    const d = s.size * 0.035;
    for (const [dx, dy] of [[0.6, -1], [1, -1.6], [1.4, -1], [1, -0.6]]) pass(dx * d, dy * d, BLACK, s.shadow / 3);
  }
  if (s.outline) {
    const steps = 20;
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      pass(Math.cos(a) * s.outline.width, Math.sin(a) * s.outline.width, s.outline.color);
    }
  }
  pass(0, 0, s.color);
}

// Draws lines downward from `top`; returns the height used.
function drawBlock(page: PDFPage, lines: string[], o: { x: number; top: number; width: number; align: "left" | "center"; style: TextStyle; leading?: number }) {
  const lead = o.style.size * (o.leading ?? 1.15);
  lines.forEach((line, i) => {
    const w = textWidth(line, o.style);
    const x = o.align === "center" ? o.x + (o.width - w) / 2 : o.x;
    drawRun(page, line, x, o.top - o.style.size * 0.88 - i * lead, o.style);
  });
  return lines.length * lead;
}

// The largest size, from `start` down to `min`, at which the text fits in `maxLines` lines. Lines are
// then balanced, so a title doesn't end with a single orphaned word.
export function fitLines(text: string, font: PDFFont, width: number, start: number, min: number, maxLines: number, tracking = 0, maxHeight = Infinity, leading = 1.15) {
  const wrapAt = (size: number, w: number) => wrapText(text, w, (s) => textWidth(s, { font, size, tracking }));
  const fits = (size: number) => {
    const n = wrapAt(size, width).length;
    return n <= maxLines && n * size * leading <= maxHeight;
  };
  let size = start;
  while (size > min && !fits(size)) size -= 1;
  size = Math.max(size, min);
  const count = wrapAt(size, width).length;
  let lo = width * 0.4;
  let hi = width;
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2;
    if (wrapAt(size, mid).length > count) lo = mid;
    else hi = mid;
  }
  return { size, lines: wrapAt(size, hi) };
}

// A 1-pixel-wide PNG whose alpha fades from `from` (bottom) to `to` (top), eased. Stretched over a
// rectangle it gives a smooth scrim behind text; stacked rectangles would show seams in some viewers.
function fadePng(c: RGB, from: number, to: number) {
  const n = 256;
  const raw = new Uint8Array(n * 5);
  for (let row = 0; row < n; row++) {
    const t = 1 - (row + 0.5) / n; // PNG rows run top to bottom
    const e = t * t * (3 - 2 * t);
    raw.set([0, c.red * 255, c.green * 255, c.blue * 255, Math.round((from + (to - from) * e) * 255)], row * 5);
  }
  const chunk = (type: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const view = new DataView(out.buffer);
    view.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
    out.set(data, 8);
    view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  new DataView(ihdr.buffer).setUint32(0, 1);
  new DataView(ihdr.buffer).setUint32(4, n);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", pako.deflate(raw)), chunk("IEND", new Uint8Array())];
  const png = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const p of parts) {
    png.set(p, at);
    at += p.length;
  }
  return png;
}

let crcTable: Uint32Array | null = null;
function crc32(bytes: Uint8Array) {
  if (!crcTable) {
    crcTable = new Uint32Array(256);
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[i] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (const b of bytes) crc = crcTable[(crc ^ b) & 255] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// pdf-lib draws SVG paths with y pointing down from (x, y), so paths are built from the top-left corner.
function roundRect(page: PDFPage, r: Rect, radius: number, c: RGB, opacity = 1) {
  const { w, h } = r;
  const k = Math.min(radius, w / 2, h / 2);
  const path = `M ${k} 0 H ${w - k} A ${k} ${k} 0 0 1 ${w} ${k} V ${h - k} A ${k} ${k} 0 0 1 ${w - k} ${h} H ${k} A ${k} ${k} 0 0 1 0 ${h - k} V ${k} A ${k} ${k} 0 0 1 ${k} 0 Z`;
  page.drawSvgPath(path, { x: r.x, y: r.y + h, color: c, opacity, borderWidth: 0 });
}

function drawBarcode(page: PDFPage, box: Rect, digits: string, font: PDFFont) {
  page.drawRectangle({ x: box.x, y: box.y, width: box.w, height: box.h, color: WHITE });
  const bits = encodeEan13(digits);
  const quiet = 11; // modules of white space either side
  const moduleW = box.w / (95 + 2 * quiet);
  const textSize = moduleW * 9;
  const barBottom = box.y + textSize + 4;
  const barTop = box.y + box.h - 6;
  for (let i = 0; i < 95; i++) {
    if (bits[i] !== "1") continue;
    const y0 = isGuardModule(i) ? barBottom - textSize * 0.6 : barBottom;
    page.drawRectangle({ x: box.x + (quiet + i) * moduleW, y: y0, width: moduleW, height: barTop - y0, color: BLACK });
  }
  const text = (s: string, x: number) => page.drawText(s, { x, y: box.y + 3, size: textSize, font, color: BLACK });
  text(digits[0], box.x + (quiet - 7) * moduleW);
  text(digits.slice(1, 7), box.x + (quiet + 3 + 4) * moduleW);
  text(digits.slice(7), box.x + (quiet + 50 + 4) * moduleW);
}

function drawImage(page: PDFPage, img: PDFImage, r: Rect) {
  page.drawImage(img, { x: r.x, y: r.y, width: r.w, height: r.h });
}

export async function buildCoverPdf(input: CoverInput): Promise<Uint8Array> {
  const t = COVER_TEMPLATES[input.template];
  const bg = color(input.background ?? t.background);
  const ink = color(t.ink);
  const accent = color(input.accent ?? t.accent);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const display = await doc.embedFont(input.fonts.display, { subset: SUBSET_SAFE(input.fonts.display) });
  const body = await doc.embedFont(input.fonts.body, { subset: SUBSET_SAFE(input.fonts.body) });
  doc.setTitle(`${input.title} (cover)`);
  doc.setAuthor(input.author);

  const { size } = input;
  const W = size.widthPt;
  const H = size.heightPt;
  const l = coverLayout(size);
  const slots = imageSlots(l, t, H);
  const page = doc.addPage([W, H]);
  const fade = async (r: Rect, c: RGB, from: number, to: number) =>
    page.drawImage(await doc.embedPng(fadePng(c, from, to)), { x: r.x, y: r.y, width: r.w, height: r.h });
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: bg });
  const frontImg = input.frontImageJpeg && slots.front ? await doc.embedJpg(input.frontImageJpeg) : null;
  const backImg = input.backImageJpeg && slots.back ? await doc.embedJpg(input.backImageJpeg) : null;

  const F = l.front;
  const fs = l.frontSafe;
  const frontBleed: Rect = { x: F.x, y: 0, w: W - F.x, h: H };
  const title = t.uppercaseTitle ? input.title.toLocaleUpperCase("el") : input.title;
  const author = t.uppercaseAuthor ? input.author.toLocaleUpperCase("el") : input.author;
  const big = fs.w * 0.15;

  // ── Front ──
  if (t.key === "classic") {
    if (frontImg) drawImage(page, frontImg, slots.front!);
    const tt = fitLines(title, display, fs.w * 0.94, big, 20, 3, 0, fs.h * 0.4, 1.1);
    const st = input.subtitle ? fitLines(input.subtitle, body, fs.w * 0.86, Math.max(12, tt.size * 0.4), 10, 2) : null;
    const blockH = tt.lines.length * tt.size * 1.1 + (st ? 22 + st.lines.length * st.size * 1.3 : 0);
    const scrimFrom = fs.y + fs.h - blockH - fs.h * 0.28;
    await fade({ x: F.x, y: scrimFrom, w: frontBleed.w, h: H - scrimFrom }, bg, 0, 0.9);
    await fade({ x: F.x, y: 0, w: frontBleed.w, h: fs.y + fs.h * 0.16 }, bg, 0.8, 0);
    let top = fs.y + fs.h - 4;
    top -= drawBlock(page, tt.lines, { x: fs.x, top, width: fs.w, align: "center", style: { font: display, size: tt.size, color: ink, shadow: 0.55 }, leading: 1.1 });
    if (st) {
      page.drawRectangle({ x: fs.x + fs.w / 2 - 24, y: top - 10, width: 48, height: 1.5, color: accent });
      drawBlock(page, st.lines, { x: fs.x, top: top - 18, width: fs.w, align: "center", style: { font: body, size: st.size, color: accent, shadow: 0.5 }, leading: 1.3 });
    }
    const a = fitLines(author, display, fs.w, Math.min(24, fs.w * 0.055), 10, 1, 0.06);
    drawBlock(page, a.lines, { x: fs.x, top: fs.y + a.size * 1.2, width: fs.w, align: "center", style: { font: display, size: a.size, color: ink, tracking: 0.06, shadow: 0.5 } });
  } else if (t.key === "kids") {
    if (frontImg) drawImage(page, frontImg, slots.front!);
    const tt = fitLines(title, display, fs.w * 0.96, big * 1.05, 20, 3, 0, fs.h * 0.42, 1.12);
    const outline = { color: bg, width: tt.size * 0.085 };
    await fade({ x: F.x, y: fs.y + fs.h * 0.55, w: frontBleed.w, h: H - (fs.y + fs.h * 0.55) }, bg, 0, 0.35);
    let top = fs.y + fs.h - outline.width;
    top -= drawBlock(page, tt.lines, { x: fs.x, top, width: fs.w, align: "center", style: { font: display, size: tt.size, color: ink, outline, shadow: 0.6 }, leading: 1.12 });
    if (input.subtitle) {
      const st = fitLines(input.subtitle, display, fs.w * 0.8, Math.max(13, tt.size * 0.36), 9, 2);
      const lead = st.size * 1.25;
      const pw = Math.max(...st.lines.map((s) => textWidth(s, { font: display, size: st.size }))) + st.size * 1.6;
      const ph = st.lines.length * lead + st.size * 0.8;
      const py = top - 10 - ph;
      roundRect(page, { x: fs.x + (fs.w - pw) / 2, y: py, w: pw, h: ph }, ph / 2, accent);
      drawBlock(page, st.lines, { x: fs.x, top: py + ph - st.size * 0.4, width: fs.w, align: "center", style: { font: display, size: st.size, color: WHITE }, leading: 1.25 });
      top = py;
    }
    if (input.ageRange) {
      const r = fs.w * 0.1;
      const cx = fs.x + fs.w - r;
      const cy = top - r * 1.25;
      page.drawCircle({ x: cx, y: cy, size: r, color: accent, borderColor: WHITE, borderWidth: r * 0.08 });
      const at = fitLines(input.ageRange, display, r * 1.35, r * 0.5, 6, 2);
      const bh = at.lines.length * at.size * 1.05;
      drawBlock(page, at.lines, { x: cx - r, top: cy + bh / 2 + at.size * 0.12, width: 2 * r, align: "center", style: { font: display, size: at.size, color: WHITE }, leading: 1.05 });
    }
    const a = fitLines(author, display, fs.w * 0.7, Math.min(20, fs.w * 0.05), 9, 1);
    const aw = textWidth(a.lines[0], { font: display, size: a.size }) + a.size * 2;
    const ah = a.size * 2;
    roundRect(page, { x: fs.x + (fs.w - aw) / 2, y: fs.y, w: aw, h: ah }, ah / 2, WHITE, 0.92);
    drawBlock(page, a.lines, { x: fs.x, top: fs.y + ah - a.size * 0.5, width: fs.w, align: "center", style: { font: display, size: a.size, color: bg } });
  } else if (t.key === "thriller") {
    if (frontImg) drawImage(page, frontImg, slots.front!);
    await fade({ x: F.x, y: 0, w: frontBleed.w, h: H * 0.62 }, bg, 0.97, 0);
    await fade({ x: F.x, y: H * 0.78, w: frontBleed.w, h: H * 0.22 }, bg, 0, 0.75);
    const a = fitLines(author, body, fs.w, Math.min(15, fs.w * 0.04), 8, 1, 0.3);
    drawBlock(page, a.lines, { x: fs.x, top: fs.y + fs.h, width: fs.w, align: "left", style: { font: body, size: a.size, color: ink, tracking: 0.3 } });
    const st = input.subtitle ? fitLines(input.subtitle, body, fs.w, Math.min(15, fs.w * 0.042), 9, 2) : null;
    const subH = st ? st.lines.length * st.size * 1.3 + 14 : 0;
    const tt = fitLines(title, display, fs.w, fs.w * 0.22, 22, 4, 0, fs.h * 0.62 - subH, 0.95);
    const titleH = tt.lines.length * tt.size * 0.95;
    const titleTop = fs.y + subH + titleH;
    page.drawRectangle({ x: fs.x, y: titleTop + 14, width: 70, height: 5, color: accent });
    drawBlock(page, tt.lines, { x: fs.x, top: titleTop, width: fs.w, align: "left", style: { font: display, size: tt.size, color: ink }, leading: 0.95 });
    if (st) drawBlock(page, st.lines, { x: fs.x, top: fs.y + subH - 10, width: fs.w, align: "left", style: { font: body, size: st.size, color: accent }, leading: 1.3 });
  } else if (t.key === "literary") {
    const frame = (inset: number, width: number) =>
      page.drawRectangle({ x: F.x + inset, y: F.y + inset, width: F.w - 2 * inset, height: F.h - 2 * inset, borderColor: accent, borderWidth: width });
    frame(fs.x - F.x - 6, 1);
    frame(fs.x - F.x - 1, 0.4);
    const a = fitLines(author, body, fs.w * 0.8, Math.min(14, fs.w * 0.035), 8, 1, 0.25);
    drawBlock(page, a.lines, { x: fs.x, top: fs.y + fs.h - 24, width: fs.w, align: "center", style: { font: body, size: a.size, color: ink, tracking: 0.25 } });
    const art = slots.front!;
    if (frontImg) {
      page.drawRectangle({ x: art.x - 5, y: art.y - 5, width: art.w + 10, height: art.h + 10, borderColor: ink, borderWidth: 0.6 });
      drawImage(page, frontImg, art);
    }
    const regionTop = fs.y + fs.h - 24 - a.size * 2.5;
    const regionBottom = frontImg ? art.y + art.h + 24 : fs.y + fs.h * 0.3;
    const tt = fitLines(title, display, fs.w * 0.86, big * 0.95, 20, 4, 0, (regionTop - regionBottom) * 0.62, 1.12);
    const st = input.subtitle ? fitLines(input.subtitle, body, fs.w * 0.75, Math.max(12, tt.size * 0.34), 9, 3) : null;
    const tH = tt.lines.length * tt.size * 1.12;
    const blockH = tH + (st ? 34 + st.lines.length * st.size * 1.35 : 0);
    const top = regionBottom + (regionTop - regionBottom + blockH) / 2;
    drawBlock(page, tt.lines, { x: fs.x, top, width: fs.w, align: "center", style: { font: display, size: tt.size, color: ink }, leading: 1.12 });
    if (st) {
      const cy = top - tH - 16;
      page.drawSvgPath("M 5 0 L 10 5 L 5 10 L 0 5 Z", { x: fs.x + fs.w / 2 - 5, y: cy + 5, color: accent, borderWidth: 0 });
      page.drawRectangle({ x: fs.x + fs.w / 2 - 50, y: cy - 0.3, width: 38, height: 0.6, color: accent });
      page.drawRectangle({ x: fs.x + fs.w / 2 + 12, y: cy - 0.3, width: 38, height: 0.6, color: accent });
      drawBlock(page, st.lines, { x: fs.x, top: cy - 16, width: fs.w, align: "center", style: { font: body, size: st.size, color: ink }, leading: 1.35 });
    }
    const imp = { font: body, size: 7.5, color: accent, tracking: 0.3 };
    drawRun(page, IMPRINT, fs.x + (fs.w - textWidth(IMPRINT, imp)) / 2, fs.y + 6, imp);
  } else {
    // modern
    const art = slots.front!;
    const seam = art.y + art.h;
    if (frontImg) drawImage(page, frontImg, art);
    else page.drawRectangle({ x: art.x, y: art.y, width: art.w, height: art.h, color: accent, opacity: 0.85 });
    page.drawRectangle({ x: F.x, y: seam - 5, width: frontBleed.w, height: 10, color: accent });
    const a = fitLines(author, body, fs.w, Math.min(15, fs.w * 0.04), 8, 1, 0.22);
    drawBlock(page, a.lines, { x: fs.x, top: fs.y + fs.h, width: fs.w, align: "left", style: { font: body, size: a.size, color: accent, tracking: 0.22 } });
    const st = input.subtitle ? fitLines(input.subtitle, body, fs.w * 0.9, Math.min(17, fs.w * 0.045), 9, 3) : null;
    const subH = st ? st.lines.length * st.size * 1.3 : 0;
    const bottom = seam + 30;
    const roomH = fs.y + fs.h - a.size * 3 - (bottom + subH + (st ? 16 : 0));
    const tt = fitLines(title, display, fs.w * 0.96, big, 20, 4, 0, roomH, 1.02);
    const titleH = tt.lines.length * tt.size * 1.02;
    if (st) drawBlock(page, st.lines, { x: fs.x, top: bottom + subH, width: fs.w, align: "left", style: { font: body, size: st.size, color: ink }, leading: 1.3 });
    drawBlock(page, tt.lines, { x: fs.x, top: bottom + subH + (st ? 16 : 0) + titleH, width: fs.w, align: "left", style: { font: display, size: tt.size, color: ink }, leading: 1.02 });
  }

  // ── Back ──
  const B = l.back;
  const bs = l.backSafe;
  if (backImg) {
    drawImage(page, backImg, slots.back!);
    await fade({ x: 0, y: bs.y + bs.h * 0.3, w: B.x + B.w, h: H - (bs.y + bs.h * 0.3) }, bg, 0, 0.8);
  } else if (t.key === "literary") {
    page.drawRectangle({ x: B.x + bs.x - B.x - 6, y: B.y + bs.y - B.y - 6, width: bs.w + 12, height: bs.h + 12, borderColor: accent, borderWidth: 1 });
  }
  const panel = t.key === "kids";
  const pad = panel ? 18 : 0;
  const textW = bs.w - 2 * pad;
  const textInk = panel ? bg : ink;
  const align = panel ? "center" : "left";
  const contentTop = bs.y + bs.h - pad - (t.key === "literary" ? 10 : 0);
  const contentBottom = l.barcode.y + l.barcode.h + 22;
  const tag = input.tagline ? fitLines(input.tagline, display, textW, Math.min(30, bs.w * 0.075), 12, 3) : null;
  const tagH = tag ? tag.lines.length * tag.size * 1.15 + 16 : 0;
  const room = contentTop - contentBottom - tagH - (panel ? pad : 0);
  let blurb = { size: 8, lines: [] as string[] };
  let bio = { size: 7, lines: [] as string[] };
  let bodyH = 0;
  for (let s = Math.min(15, bs.w * 0.027); s >= 7.5; s -= 0.5) {
    const lines = wrapText(input.backText, textW, (str) => body.widthOfTextAtSize(str, s));
    const bs2 = s * 0.86;
    const bioLines = input.authorBio ? wrapText(input.authorBio, textW, (str) => body.widthOfTextAtSize(str, bs2)) : [];
    const h = lines.length * s * 1.45 + (bioLines.length ? 26 + bioLines.length * bs2 * 1.4 : 0);
    blurb = { size: s, lines };
    bio = { size: bs2, lines: bioLines };
    bodyH = h;
    if (h <= room) break;
  }
  if (panel && (tag || blurb.lines.some(Boolean))) {
    const h = tagH + bodyH + 2 * pad;
    roundRect(page, { x: bs.x, y: contentTop + pad - h, w: bs.w, h }, 18, WHITE, 0.9);
  }
  let top = contentTop;
  if (tag) {
    drawBlock(page, tag.lines, { x: bs.x + pad, top, width: textW, align, style: { font: display, size: tag.size, color: panel ? accent : t.backImage ? ink : accent, shadow: backImg && !panel ? 0.5 : undefined }, leading: 1.15 });
    top -= tagH;
  }
  top -= drawBlock(page, blurb.lines, { x: bs.x + pad, top, width: textW, align, style: { font: body, size: blurb.size, color: textInk, shadow: backImg && !panel ? 0.35 : undefined }, leading: 1.45 });
  if (bio.lines.length) {
    const rx = align === "center" ? bs.x + bs.w / 2 - 20 : bs.x + pad;
    page.drawRectangle({ x: rx, y: top - 12, width: 40, height: 1.5, color: accent });
    drawBlock(page, bio.lines, { x: bs.x + pad, top: top - 24, width: textW, align, style: { font: body, size: bio.size, color: textInk, shadow: backImg && !panel ? 0.35 : undefined }, leading: 1.4 });
  }
  const isbn = input.isbn ? normalizeIsbn13(input.isbn) : null;
  if (isbn) drawBarcode(page, l.barcode, isbn, body);
  drawRun(page, IMPRINT, bs.x, bs.y + 6, { font: body, size: 7.5, color: t.key === "literary" ? accent : ink, tracking: 0.3, shadow: backImg ? 0.5 : undefined });

  // ── Spine: reads top to bottom, as on Greek and English books ──
  const S = l.spine;
  page.drawRectangle({ x: S.x, y: 0, width: S.w, height: H, color: bg });
  if (l.spineText) {
    const margin = 0.4 * PT_PER_INCH;
    const room = S.h - 2 * margin;
    const gap = S.w * 1.2;
    let s = Math.min(S.w * 0.5, 18);
    const lengths = (sz: number) => [display.widthOfTextAtSize(title, sz), body.widthOfTextAtSize(input.author, sz * 0.8)];
    while (s > 5 && lengths(s)[0] + lengths(s)[1] + gap > room) s -= 0.25;
    const [titleLen, authorLen] = lengths(s);
    drawRun(page, title, S.x + S.w / 2 - s * 0.35, S.y + S.h - margin, { font: display, size: s, color: ink }, -90);
    // On very thin spines with long titles there is no room for both; the title wins.
    if (titleLen + authorLen + gap <= room) {
      drawRun(page, input.author, S.x + S.w / 2 - s * 0.28, S.y + margin + authorLen, { font: body, size: s * 0.8, color: accent }, -90);
    }
  }

  return doc.save();
}
