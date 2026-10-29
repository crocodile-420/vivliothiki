import { describe, expect, it } from "vitest";
import { minimumPrintPriceCents, splitSale, stripeFeeCents } from "./pricing";

describe("splitSale", () => {
  it("splits a €19.90 paperback printed for €8.89", () => {
    const s = splitSale({ priceCents: 1990, printCostCents: 889, commissionPercent: 20 });
    expect(s.vatCents).toBe(113);
    expect(s.paymentFeeCents).toBe(55);
    // 1990 - 113 - 55 - 889 = 933, of which 20% goes to the platform
    expect(s.platformCents).toBe(187);
    expect(s.authorCents).toBe(746);
  });

  it("never pays out a negative amount", () => {
    const s = splitSale({ priceCents: 900, printCostCents: 889, commissionPercent: 20 });
    expect(s.authorCents).toBe(0);
    expect(s.platformCents).toBe(0);
  });

  it("handles an ebook with no print cost", () => {
    const s = splitSale({ priceCents: 699, commissionPercent: 20 });
    expect(s.vatCents + s.paymentFeeCents + s.platformCents + s.authorCents).toBe(699);
  });
});

describe("fees", () => {
  it("charges 1.5% + 25 cents", () => expect(stripeFeeCents(1000)).toBe(40));

  it("finds a break-even print price", () => {
    const min = minimumPrintPriceCents(889);
    expect(splitSale({ priceCents: min, printCostCents: 889, commissionPercent: 0 }).authorCents).toBeGreaterThanOrEqual(0);
    expect(splitSale({ priceCents: min - 5, printCostCents: 889, commissionPercent: 0 }).authorCents).toBe(0);
  });
});
