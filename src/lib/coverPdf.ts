import fontkit from "@pdf-lib/fontkit";
import { degrees, PDFDocument, type PDFFont, type PDFPage, rgb } from "pdf-lib";
import { type CoverSize, coverLayout, type Rect, wrapText } from "./cover";
import { COVER_TEMPLATES, type CoverTemplateKey, hexToRgb01 } from "./coverTemplates";
import { encodeEan13, isGuardModule, normalizeIsbn13 } from "./ean13";

export interface CoverInput {
  size: CoverSize;
  template: CoverTemplateKey;
  title: string;
  subtitle?: string;
  author: string;
  backText: string;
  isbn?: string;
  background?: string;
  accent?: string;
  // JPEG already cropped (and filtered) to the front artwork rectangle, from prepareFrontImage.
  frontImageJpeg?: Uint8Array;
  fonts: { regular: Uint8Array; bold: Uint8Array };
}

const color = (hex: string) => rgb(...hexToRgb01(hex));

// Shrinks the font until the text fits in `maxLines` lines of `width`.
function fit(text: string, font: PDFFont, width: number, start: number, min: number, maxLines: number) {
  for (let size = start; size >= min; size -= 1) {
    const lines = wrapText(text, width, (s) => font.widthOfTextAtSize(s, size));
    if (lines.length <= maxLines) return { size, lines };
  }
  return { size: min, lines: wrapText(text, width, (s) => font.widthOfTextAtSize(s, min)) };
}

function drawLines(page: PDFPage, lines: string[], o: { font: PDFFont; size: number; x: number; top: number; width: number; align: "left" | "center"; color: ReturnType<typeof rgb>; leading?: number }) {
  const lead = o.size * (o.leading ?? 1.15);
  lines.forEach((line, i) => {
    const w = o.font.widthOfTextAtSize(line, o.size);
    const x = o.align === "center" ? o.x + (o.width - w) / 2 : o.x;
    page.drawText(line, { x, y: o.top - o.size - i * lead, size: o.size, font: o.font, color: o.color });
  });
  return lines.length * lead;
}

function drawBarcode(page: PDFPage, box: Rect, digits: string, font: PDFFont) {
  page.drawRectangle({ x: box.x, y: box.y, width: box.w, height: box.h, color: rgb(1, 1, 1) });
  const bits = encodeEan13(digits);
  const quiet = 11; // modules of white space either side
  const moduleW = box.w / (95 + 2 * quiet);
  const textSize = moduleW * 9;
  const barBottom = box.y + textSize + 4;
  const barTop = box.y + box.h - 6;
  for (let i = 0; i < 95; i++) {
    if (bits[i] !== "1") continue;
    const y0 = isGuardModule(i) ? barBottom - textSize * 0.6 : barBottom;
    page.drawRectangle({ x: box.x + (quiet + i) * moduleW, y: y0, width: moduleW, height: barTop - y0, color: rgb(0, 0, 0) });
  }
  const text = (s: string, x: number) => page.drawText(s, { x, y: box.y + 3, size: textSize, font, color: rgb(0, 0, 0) });
  text(digits[0], box.x + (quiet - 7) * moduleW);
  text(digits.slice(1, 7), box.x + (quiet + 3 + 4) * moduleW);
  text(digits.slice(7), box.x + (quiet + 50 + 4) * moduleW);
}

export async function buildCoverPdf(input: CoverInput): Promise<Uint8Array> {
  const t = COVER_TEMPLATES[input.template];
  const bg = color(input.background ?? t.background);
  const ink = color(t.ink);
  const accent = color(input.accent ?? t.accent);
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const regular = await doc.embedFont(input.fonts.regular, { subset: true });
  const bold = await doc.embedFont(input.fonts.bold, { subset: true });
  doc.setTitle(`${input.title} (cover)`);
  doc.setAuthor(input.author);

  const { size } = input;
  const l = coverLayout(size);
  const page = doc.addPage([size.widthPt, size.heightPt]);
  page.drawRectangle({ x: 0, y: 0, width: size.widthPt, height: size.heightPt, color: bg });

  // Front panel
  const fs = l.frontSafe;
  if (t.usesImage && input.frontImageJpeg) {
    const img = await doc.embedJpg(input.frontImageJpeg);
    page.drawImage(img, { x: l.frontArt.x, y: l.frontArt.y, width: l.frontArt.w, height: l.frontArt.h });
  }
  const author = t.uppercaseAuthor ? input.author.toLocaleUpperCase("el") : input.author;
  const titleStart = Math.min(64, fs.w / 6);

  if (t.titlePlacement === "top-band") {
    const title = fit(input.title, bold, fs.w, titleStart, 20, 3);
    const subtitle = input.subtitle ? fit(input.subtitle, regular, fs.w, title.size * 0.45, 10, 2) : null;
    const bandH = title.lines.length * title.size * 1.15 + (subtitle ? subtitle.lines.length * subtitle.size * 1.3 + 8 : 0) + 40;
    page.drawRectangle({ x: l.front.x, y: l.front.y + l.front.h - bandH - 18, width: l.front.w + l.extra, height: bandH + 18 + l.extra, color: bg, opacity: 0.78 });
    let top = fs.y + fs.h;
    top -= drawLines(page, title.lines, { font: bold, size: title.size, x: fs.x, top, width: fs.w, align: "center", color: ink });
    if (subtitle) drawLines(page, subtitle.lines, { font: regular, size: subtitle.size, x: fs.x, top: top - 8, width: fs.w, align: "center", color: accent, leading: 1.3 });
    const a = fit(author, regular, fs.w, 20, 10, 1);
    page.drawRectangle({ x: l.front.x, y: 0, width: l.front.w + l.extra, height: fs.y - l.front.y + l.extra + a.size * 2.2, color: bg, opacity: 0.78 });
    drawLines(page, a.lines, { font: regular, size: a.size, x: fs.x, top: fs.y + a.size * 1.6, width: fs.w, align: "center", color: ink });
  } else if (t.titlePlacement === "bottom") {
    const title = fit(input.title.toLocaleUpperCase("el"), bold, fs.w, titleStart, 20, 4);
    const lineH = title.size * 1.05;
    const blockH = title.lines.length * lineH;
    page.drawRectangle({ x: l.front.x, y: 0, width: l.front.w + l.extra, height: fs.y + blockH + 70, color: bg, opacity: 0.82 });
    page.drawRectangle({ x: fs.x, y: fs.y + blockH + 26, width: 60, height: 4, color: accent });
    drawLines(page, title.lines, { font: bold, size: title.size, x: fs.x, top: fs.y + blockH + 12, width: fs.w, align: "left", color: ink, leading: 1.05 });
    const a = fit(author, regular, fs.w, 16, 9, 1);
    drawLines(page, a.lines, { font: regular, size: a.size, x: fs.x, top: fs.y + fs.h, width: fs.w, align: "left", color: ink });
    if (input.subtitle) {
      const s = fit(input.subtitle, regular, fs.w, 13, 9, 2);
      drawLines(page, s.lines, { font: regular, size: s.size, x: fs.x, top: fs.y + fs.h - a.size * 1.8, width: fs.w, align: "left", color: accent });
    }
  } else if (t.titlePlacement === "top-box") {
    const pad = 16;
    const title = fit(input.title, bold, fs.w - 2 * pad, titleStart, 18, 3);
    const subtitle = input.subtitle ? fit(input.subtitle, regular, fs.w - 2 * pad, title.size * 0.45, 10, 2) : null;
    const boxH = title.lines.length * title.size * 1.15 + (subtitle ? subtitle.lines.length * subtitle.size * 1.3 + 6 : 0) + 2 * pad;
    page.drawRectangle({ x: fs.x, y: fs.y + fs.h - boxH, width: fs.w, height: boxH, color: rgb(1, 1, 1), opacity: 0.92, borderColor: accent, borderWidth: 3 });
    let top = fs.y + fs.h - pad;
    top -= drawLines(page, title.lines, { font: bold, size: title.size, x: fs.x + pad, top, width: fs.w - 2 * pad, align: "center", color: color(t.ink) });
    if (subtitle) drawLines(page, subtitle.lines, { font: regular, size: subtitle.size, x: fs.x + pad, top: top - 6, width: fs.w - 2 * pad, align: "center", color: accent, leading: 1.3 });
    const a = fit(author, bold, fs.w, 18, 10, 1);
    const aw = bold.widthOfTextAtSize(a.lines[0], a.size) + 28;
    page.drawRectangle({ x: fs.x + (fs.w - aw) / 2, y: fs.y, width: aw, height: a.size * 1.9, color: accent });
    drawLines(page, a.lines, { font: bold, size: a.size, x: fs.x, top: fs.y + a.size * 1.45, width: fs.w, align: "center", color: rgb(1, 1, 1) });
  } else {
    const title = fit(input.title, bold, fs.w * 0.85, titleStart, 20, 4);
    const lead = title.size * 1.15;
    const blockH = title.lines.length * lead;
    const top = fs.y + fs.h / 2 + blockH / 2 + 30;
    drawLines(page, title.lines, { font: bold, size: title.size, x: fs.x, top, width: fs.w, align: "center", color: ink });
    const ruleY = top - blockH - 22;
    page.drawRectangle({ x: fs.x + fs.w / 2 - 30, y: ruleY, width: 60, height: 1.5, color: accent });
    if (input.subtitle) {
      const s = fit(input.subtitle, regular, fs.w * 0.8, 15, 9, 2);
      drawLines(page, s.lines, { font: regular, size: s.size, x: fs.x, top: ruleY - 12, width: fs.w, align: "center", color: ink, leading: 1.3 });
    }
    const a = fit(author, regular, fs.w, 16, 9, 1);
    drawLines(page, a.lines, { font: regular, size: a.size, x: fs.x, top: fs.y + a.size * 3, width: fs.w, align: "center", color: accent });
  }

  // Spine: reads top to bottom, as on Greek and English books.
  if (l.spineText) {
    const room = l.spine.h - 2 * 0.375 * 72;
    const s = Math.min(l.spine.w * 0.55, 16);
    const text = `${input.title}  ·  ${input.author}`;
    const fitSize = Math.min(s, (room / bold.widthOfTextAtSize(text, 1)) || s);
    const w = bold.widthOfTextAtSize(text, fitSize);
    page.drawText(text, {
      x: l.spine.x + l.spine.w / 2 - fitSize * 0.35,
      y: l.spine.y + l.spine.h / 2 + w / 2,
      size: fitSize,
      font: bold,
      color: ink,
      rotate: degrees(-90),
    });
  }

  // Back panel
  const bs = l.backSafe;
  const backColor = color(input.background ?? t.background);
  page.drawRectangle({ x: 0, y: 0, width: l.spine.x, height: size.heightPt, color: backColor });
  let top = bs.y + bs.h - 10;
  const head = fit(input.title, bold, bs.w, 22, 12, 2);
  top -= drawLines(page, head.lines, { font: bold, size: head.size, x: bs.x, top, width: bs.w, align: "left", color: ink });
  page.drawRectangle({ x: bs.x, y: top - 12, width: 40, height: 2, color: accent });
  const bodyArea = top - 26 - (l.barcode.y + l.barcode.h + 16);
  for (let size = 15; size >= 8; size -= 0.5) {
    const lines = wrapText(input.backText, bs.w, (str) => regular.widthOfTextAtSize(str, size));
    if (lines.length * size * 1.45 <= bodyArea || size === 8) {
      drawLines(page, lines, { font: regular, size, x: bs.x, top: top - 26, width: bs.w, align: "left", color: ink, leading: 1.45 });
      break;
    }
  }
  const isbn = input.isbn ? normalizeIsbn13(input.isbn) : null;
  if (isbn) drawBarcode(page, l.barcode, isbn, regular);
  page.drawText("Vivliothiki Books", { x: bs.x, y: bs.y + 4, size: 9, font: regular, color: accent });

  return doc.save();
}
