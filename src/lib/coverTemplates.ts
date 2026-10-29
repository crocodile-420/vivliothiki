// Cover templates authors pick from. Each is a small set of decisions applied by buildCoverPdf.

export type CoverTemplateKey = "classic" | "noir" | "kids" | "literary";

export interface CoverTemplate {
  key: CoverTemplateKey;
  label: { el: string; en: string };
  // Hex colors; the author can override background and accent.
  background: string;
  ink: string;
  accent: string;
  imageFilter: "none" | "grayscale"; // applied in the browser before embedding
  usesImage: boolean;
  titlePlacement: "top-band" | "bottom" | "top-box" | "center";
  uppercaseAuthor: boolean;
}

export const COVER_TEMPLATES: Record<CoverTemplateKey, CoverTemplate> = {
  classic: {
    key: "classic",
    label: { el: "Κλασικό: εικόνα σε όλο το εξώφυλλο", en: "Classic: full-cover image" },
    background: "#2b2620",
    ink: "#fbf4e6",
    accent: "#d9a85b",
    imageFilter: "none",
    usesImage: true,
    titlePlacement: "top-band",
    uppercaseAuthor: false,
  },
  noir: {
    key: "noir",
    label: { el: "Αστυνομικό: σκοτεινό, ασπρόμαυρη εικόνα", en: "Crime: dark, black-and-white image" },
    background: "#0e0e10",
    ink: "#f2f2f2",
    accent: "#c4302b",
    imageFilter: "grayscale",
    usesImage: true,
    titlePlacement: "bottom",
    uppercaseAuthor: true,
  },
  kids: {
    key: "kids",
    label: { el: "Παιδικό: φωτεινό, τίτλος σε πλαίσιο", en: "Children: bright, framed title" },
    background: "#fdf3d8",
    ink: "#3a2a60",
    accent: "#ef7d3c",
    imageFilter: "none",
    usesImage: true,
    titlePlacement: "top-box",
    uppercaseAuthor: false,
  },
  literary: {
    key: "literary",
    label: { el: "Λογοτεχνικό: μόνο τυπογραφία, χωρίς εικόνα", en: "Literary: type only, no image" },
    background: "#efe7d6",
    ink: "#22201c",
    accent: "#7a2e22",
    imageFilter: "none",
    usesImage: false,
    titlePlacement: "center",
    uppercaseAuthor: true,
  },
};

export function hexToRgb01(hex: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return [0, 0, 0];
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
