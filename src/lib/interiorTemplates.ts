// Page designs for the inside of a printed book, chosen in the Word import tool.

export type InteriorTemplateKey = "classic" | "modern" | "kids";

export interface InteriorTemplate {
  key: InteriorTemplateKey;
  label: { el: string; en: string };
  // Files under /fonts. All cover Greek and Latin. With no italic file, italics are slanted.
  fonts: { regular: string; italic?: string; bold: string; display: string };
  size: number; // body size in pt on a 6×9 in page; larger trims scale it up a little
  leading: number;
  justify: boolean;
  indent: number; // first-line indent, in em; 0 puts space between paragraphs instead
  paragraphGap: number; // in lines
  headingAlign: "center" | "left";
  chapterOnRight: boolean; // chapters open on a right-hand page, as in most novels
  chapterDrop: number; // how far down the page a chapter title sits, as a share of the text height
  imageMaxHeight: number; // share of the text height
}

export const INTERIOR_TEMPLATES: Record<InteriorTemplateKey, InteriorTemplate> = {
  classic: {
    key: "classic",
    label: { el: "Κλασικό: μυθιστόρημα, πλήρης στοίχιση", en: "Classic: novel, justified" },
    fonts: { regular: "Literata_400Regular.ttf", italic: "Literata_400Italic.ttf", bold: "Literata_700Bold.ttf", display: "Literata_700Bold.ttf" },
    size: 10.5,
    leading: 1.42,
    justify: true,
    indent: 1.4,
    paragraphGap: 0,
    headingAlign: "center",
    chapterOnRight: true,
    chapterDrop: 0.24,
    imageMaxHeight: 0.6,
  },
  modern: {
    key: "modern",
    label: { el: "Μοντέρνο: δοκίμιο ή οδηγός, κενό ανάμεσα στις παραγράφους", en: "Modern: non-fiction or guide, space between paragraphs" },
    fonts: { regular: "FiraSans_400Regular.ttf", italic: "FiraSans_400Italic.ttf", bold: "FiraSans_800ExtraBold.ttf", display: "FiraSans_800ExtraBold.ttf" },
    size: 10,
    leading: 1.5,
    justify: false,
    indent: 0,
    paragraphGap: 0.6,
    headingAlign: "left",
    chapterOnRight: true,
    chapterDrop: 0.12,
    imageMaxHeight: 0.6,
  },
  kids: {
    key: "kids",
    label: { el: "Παιδικό: μεγάλα στρογγυλά γράμματα και εικόνες", en: "Children: large rounded type and pictures" },
    fonts: { regular: "Comfortaa_600SemiBold.ttf", bold: "Comfortaa_700Bold.ttf", display: "Comfortaa_700Bold.ttf" },
    size: 15,
    leading: 1.6,
    justify: false,
    indent: 0,
    paragraphGap: 0.8,
    headingAlign: "center",
    chapterOnRight: false,
    chapterDrop: 0.06,
    imageMaxHeight: 0.8,
  },
};
