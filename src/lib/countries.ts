import type Stripe from "stripe";

// Where printed books can be shipped: the EU plus nearby markets Lulu prints for.
export const SHIP_TO: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] = [
  "GR", "CY", "AT", "BE", "BG", "HR", "CZ", "DK", "EE", "FI", "FR", "DE", "HU", "IE", "IT", "LV", "LT", "LU", "MT",
  "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE", "GB", "CH", "NO", "AL", "US", "CA", "AU",
];
