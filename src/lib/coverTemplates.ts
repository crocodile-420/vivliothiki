// Cover templates authors pick from. Each is a small set of decisions applied by buildCoverPdf.
import type { CoverLayout, Rect } from "./cover";

export type CoverTemplateKey = "classic" | "kids" | "thriller" | "literary" | "modern";

export interface CoverTemplate {
  key: CoverTemplateKey;
  label: { el: string; en: string };
  // Files under /fonts. Every font here covers Greek and Latin.
  fonts: { display: string; body: string };
  // Hex colors; the author can override background and accent.
  background: string;
  ink: string;
  accent: string;
  imageFilter: "none" | "noir"; // applied in the browser before embedding
  // Where the front artwork goes: the whole front, a framed picture, the lower part, or nowhere.
  frontImage: "full" | "inset" | "lower" | "none";
  // Whether the back panel carries artwork: the author's own back image, or the front one blurred.
  backImage: boolean;
  uppercaseTitle: boolean;
  uppercaseAuthor: boolean;
}

export const COVER_TEMPLATES: Record<CoverTemplateKey, CoverTemplate> = {
  classic: {
    key: "classic",
    label: { el: "Κλασικό: εικόνα σε όλο το εξώφυλλο", en: "Classic: full-cover image" },
    fonts: { display: "Literata_700Bold.ttf", body: "Literata_400Regular.ttf" },
    background: "#1d2340",
    ink: "#fffaf0",
    accent: "#f2c46d",
    imageFilter: "none",
    frontImage: "full",
    backImage: true,
    uppercaseTitle: false,
    uppercaseAuthor: false,
  },
  kids: {
    key: "kids",
    label: { el: "Παιδικό: στρογγυλά γράμματα με περίγραμμα", en: "Children: rounded, outlined letters" },
    fonts: { display: "Comfortaa_700Bold.ttf", body: "Comfortaa_600SemiBold.ttf" },
    background: "#3b2a73",
    ink: "#ffffff",
    accent: "#ff8a3d",
    imageFilter: "none",
    frontImage: "full",
    backImage: true,
    uppercaseTitle: false,
    uppercaseAuthor: false,
  },
  thriller: {
    key: "thriller",
    label: { el: "Αστυνομικό / θρίλερ: σκοτεινό, μεγάλα γράμματα", en: "Crime / thriller: dark, big type" },
    fonts: { display: "FiraSansExtraCondensed_800ExtraBold.ttf", body: "FiraSans_400Regular.ttf" },
    background: "#0b0b0d",
    ink: "#f4f4f4",
    accent: "#d7262e",
    imageFilter: "noir",
    frontImage: "full",
    backImage: true,
    uppercaseTitle: true,
    uppercaseAuthor: true,
  },
  literary: {
    key: "literary",
    label: { el: "Λογοτεχνία: χαρτί, πλαίσιο, μικρή εικόνα", en: "Literary: paper, frame, small picture" },
    fonts: { display: "GentiumBookPlus-Bold.ttf", body: "GentiumBookPlus-Regular.ttf" },
    background: "#f1eadb",
    ink: "#23201b",
    accent: "#8a3324",
    imageFilter: "none",
    frontImage: "inset",
    backImage: false,
    uppercaseTitle: false,
    uppercaseAuthor: true,
  },
  modern: {
    key: "modern",
    label: { el: "Δοκίμιο / οδηγός: χρώμα πάνω, εικόνα κάτω", en: "Non-fiction: color on top, image below" },
    fonts: { display: "FiraSans_800ExtraBold.ttf", body: "FiraSans_400Regular.ttf" },
    background: "#0f5257",
    ink: "#ffffff",
    accent: "#f5b700",
    imageFilter: "none",
    frontImage: "lower",
    backImage: false,
    uppercaseTitle: false,
    uppercaseAuthor: true,
  },
};

// The rectangles the artwork is cropped to, in cover coordinates. The browser crops to these
// before embedding, so the PDF only carries the pixels it shows.
export function imageSlots(l: CoverLayout, t: CoverTemplate, coverHeight: number): { front: Rect | null; back: Rect | null } {
  const fs = l.frontSafe;
  let front: Rect | null = null;
  if (t.frontImage === "full") front = l.frontArt;
  else if (t.frontImage === "lower") front = { x: l.front.x, y: 0, w: l.frontArt.w, h: l.extra + l.front.h * 0.46 };
  else if (t.frontImage === "inset") {
    const w = fs.w * 0.72;
    const h = Math.min(w * 1.1, fs.h * 0.42);
    front = { x: fs.x + (fs.w - w) / 2, y: fs.y + fs.h * 0.14, w, h };
  }
  const back = t.backImage ? { x: 0, y: 0, w: l.back.x + l.back.w, h: coverHeight } : null;
  return { front, back };
}

export function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
