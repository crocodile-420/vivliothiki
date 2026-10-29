import { readFileSync } from "node:fs";
import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { estimateCoverSize } from "./cover";
import { COVER_TEMPLATES, type CoverTemplateKey } from "./coverTemplates";
import { buildCoverPdf } from "./coverPdf";

const font = (name: string) => new Uint8Array(readFileSync(`public/fonts/${name}`));

describe("buildCoverPdf", () => {
  for (const key of Object.keys(COVER_TEMPLATES) as CoverTemplateKey[]) {
    it(`builds a one-page cover at the exact size with the ${key} template`, async () => {
      const size = estimateCoverSize("0850X1100FCSTDPB080CW444GXX", 104);
      const bytes = await buildCoverPdf({
        size,
        template: key,
        title: "Οι Ιστορίες του Papa Tony",
        subtitle: "Τρία παραμύθια για καληνύχτα",
        author: "Papa Tony",
        backText: "Τρεις ιστορίες για το βράδυ με τον δράκο Τίκο, τη Μίρα και τη Λούμι.\nΜε ερωτήσεις για συζήτηση πριν τον ύπνο.",
        tagline: "Ένας δράκος, μια πριγκίπισσα και ένα αστεράκι",
        authorBio: "Ο Papa Tony γράφει ιστορίες για τα εγγόνια του.",
        ageRange: "3-7 ετών",
        isbn: "978-0-306-40615-7",
        fonts: { display: font(COVER_TEMPLATES[key].fonts.display), body: font(COVER_TEMPLATES[key].fonts.body) },
      });
      const doc = await PDFDocument.load(bytes);
      expect(doc.getPageCount()).toBe(1);
      const { width, height } = doc.getPage(0).getSize();
      expect(width).toBeCloseTo(size.widthPt, 1);
      expect(height).toBeCloseTo(size.heightPt, 1);
    });
  }
});
