// Geometry of a wraparound print cover: back panel, spine, front panel, plus bleed or hardcover wrap.
// All measurements are in PDF points (1 in = 72 pt).

export const PT_PER_INCH = 72;
export const BLEED_IN = 0.125;
export const SAFE_IN = 0.25; // keep text this far inside the trim
export const MIN_SPINE_TEXT_IN = 0.25; // printers won't print spine text on thinner spines

export interface CoverSize {
  widthPt: number;
  heightPt: number;
  trimWidthPt: number;
  trimHeightPt: number;
  source: "lulu" | "estimate";
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CoverLayout {
  extra: number; // bleed (paperback) or wrap (hardcover) around the trim
  spine: Rect;
  back: Rect; // trimmed back panel
  front: Rect; // trimmed front panel
  frontArt: Rect; // front panel including outer bleed/wrap, for full-bleed artwork
  backSafe: Rect;
  frontSafe: Rect;
  barcode: Rect;
  spineText: boolean;
}

// "0850X1100…" → 8.5 × 11 in.
export function trimFromPodPackage(podPackageId: string): { widthIn: number; heightIn: number } {
  const m = /^(\d{4})X(\d{4})/.exec(podPackageId);
  if (!m) throw new Error(`Unknown package ${podPackageId}`);
  return { widthIn: Number(m[1]) / 100, heightIn: Number(m[2]) / 100 };
}

// Used only when the Lulu API isn't configured. Lulu's own cover-dimensions call is the authority.
export function estimateCoverSize(podPackageId: string, pageCount: number): CoverSize {
  const { widthIn, heightIn } = trimFromPodPackage(podPackageId);
  const hardcover = podPackageId.slice(14, 16) === "CW";
  const extra = hardcover ? 0.75 : BLEED_IN;
  const spineIn = pageCount / 444 + (hardcover ? 0.25 : 0.06);
  return {
    widthPt: (2 * widthIn + spineIn + 2 * extra) * PT_PER_INCH,
    heightPt: (heightIn + 2 * extra) * PT_PER_INCH,
    trimWidthPt: widthIn * PT_PER_INCH,
    trimHeightPt: heightIn * PT_PER_INCH,
    source: "estimate",
  };
}

// PDF coordinates: origin bottom-left. The back panel is on the left, the front on the right.
export function coverLayout(size: CoverSize): CoverLayout {
  const extra = (size.heightPt - size.trimHeightPt) / 2;
  const spineW = size.widthPt - 2 * size.trimWidthPt - 2 * extra;
  const safe = SAFE_IN * PT_PER_INCH;
  const back = { x: extra, y: extra, w: size.trimWidthPt, h: size.trimHeightPt };
  const spine = { x: extra + size.trimWidthPt, y: extra, w: spineW, h: size.trimHeightPt };
  const front = { x: spine.x + spineW, y: extra, w: size.trimWidthPt, h: size.trimHeightPt };
  const inset = (r: Rect): Rect => ({ x: r.x + safe, y: r.y + safe, w: r.w - 2 * safe, h: r.h - 2 * safe });
  const backSafe = inset(back);
  const barcodeW = 2 * PT_PER_INCH;
  const barcodeH = 1.2 * PT_PER_INCH;
  return {
    extra,
    spine,
    back,
    front,
    frontArt: { x: front.x, y: 0, w: size.widthPt - front.x, h: size.heightPt },
    backSafe,
    frontSafe: inset(front),
    barcode: { x: backSafe.x + backSafe.w - barcodeW, y: backSafe.y, w: barcodeW, h: barcodeH },
    spineText: spineW >= MIN_SPINE_TEXT_IN * PT_PER_INCH,
  };
}

// Greedy word wrap; `measure` returns a string's width in points at the font size in use.
export function wrapText(text: string, maxWidth: number, measure: (s: string) => number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\n/)) {
    let line = "";
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const candidate = line ? `${line} ${word}` : word;
      if (measure(candidate) <= maxWidth || !line) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
}
