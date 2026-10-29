// Money is kept in integer cents throughout.

export const GREEK_BOOK_VAT_PERCENT = 6;

export function formatPrice(cents: number, locale = "el-GR", currency = "EUR"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(cents / 100);
}

export interface SaleBreakdown {
  vatCents: number;
  paymentFeeCents: number;
  printCostCents: number;
  shippingSubsidyCents: number;
  platformCents: number;
  authorCents: number;
}

// Splits one sale (VAT-inclusive price) into VAT, costs, the platform's commission and the author's earnings.
// The commission is taken from what remains after VAT and costs, so authors never earn on money that was never there.
export function splitSale(opts: {
  priceCents: number;
  printCostCents?: number;
  shippingSubsidyCents?: number;
  commissionPercent: number;
  vatPercent?: number;
}): SaleBreakdown {
  const vatPercent = opts.vatPercent ?? GREEK_BOOK_VAT_PERCENT;
  const vatCents = Math.round(opts.priceCents - opts.priceCents / (1 + vatPercent / 100));
  const paymentFeeCents = stripeFeeCents(opts.priceCents);
  const printCostCents = opts.printCostCents ?? 0;
  const shippingSubsidyCents = opts.shippingSubsidyCents ?? 0;
  const net = opts.priceCents - vatCents - paymentFeeCents - printCostCents - shippingSubsidyCents;
  const positive = Math.max(net, 0);
  const platformCents = Math.round((positive * opts.commissionPercent) / 100);
  return {
    vatCents,
    paymentFeeCents,
    printCostCents,
    shippingSubsidyCents,
    platformCents,
    authorCents: positive - platformCents,
  };
}

// Stripe's standard rate for EEA cards: 1.5% + €0.25.
export function stripeFeeCents(amountCents: number): number {
  return Math.round(amountCents * 0.015) + 25;
}

// The lowest price at which a print edition still leaves the author something after costs.
export function minimumPrintPriceCents(printCostCents: number, vatPercent = GREEK_BOOK_VAT_PERCENT): number {
  // price - vat - fee - print > 0  =>  price * (1/(1+v) - 0.015) > print + 25
  const factor = 1 / (1 + vatPercent / 100) - 0.015;
  return Math.ceil((printCostCents + 25) / factor);
}
