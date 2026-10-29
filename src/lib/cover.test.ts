import { describe, expect, it } from "vitest";
import { coverLayout, estimateCoverSize, trimFromPodPackage, wrapText } from "./cover";

describe("cover geometry", () => {
  it("reads the trim size from a Lulu package id", () => {
    expect(trimFromPodPackage("0850X1100FCSTDPB080CW444GXX")).toEqual({ widthIn: 8.5, heightIn: 11 });
  });

  it("lays out a 104-page US Letter paperback", () => {
    const size = estimateCoverSize("0850X1100FCSTDPB080CW444GXX", 104);
    const l = coverLayout(size);
    expect(l.extra).toBeCloseTo(9); // 0.125 in bleed
    expect(l.spine.w / 72).toBeCloseTo(104 / 444 + 0.06);
    // Panels tile the width exactly: bleed + back + spine + front + bleed.
    expect(l.front.x + l.front.w + l.extra).toBeCloseTo(size.widthPt);
    expect(l.spineText).toBe(true);
    // The barcode sits inside the back panel's safe area.
    expect(l.barcode.x + l.barcode.w).toBeLessThanOrEqual(l.backSafe.x + l.backSafe.w + 0.001);
  });

  it("gives hardcovers a wrap margin and no spine text on thin books", () => {
    const l = coverLayout(estimateCoverSize("0600X0900BWSTDCW060UW444MXX", 24));
    expect(l.extra / 72).toBeCloseTo(0.75);
    const thin = coverLayout(estimateCoverSize("0600X0900BWSTDPB060UW444MXX", 24));
    expect(thin.spineText).toBe(false);
  });
});

describe("wrapText", () => {
  const measure = (s: string) => s.length * 10;
  it("wraps on word boundaries", () => expect(wrapText("ένα δύο τρία τέσσερα", 90, measure)).toEqual(["ένα δύο", "τρία", "τέσσερα"]));
  it("keeps paragraph breaks", () => expect(wrapText("α\nβ", 100, measure)).toEqual(["α", "β"]));
});
