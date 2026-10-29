import { requireEnv } from "@/lib/env";

// Lulu Print API client. Docs: https://api.lulu.com/docs/
// Every call goes to LULU_API_BASE, so the sandbox and production differ only by environment.

// Lulu identifies a printed product by a "pod package id":
// trim size + ink + quality + binding + paper + ppi + finish + linen + foil.
// Verify these in the sandbox before the first live order.
export const PRINT_PACKAGES = {
  "letter-paperback-standard-color": {
    podPackageId: "0850X1100FCSTDPB080CW444GXX",
    label: { el: "Μαλακό εξώφυλλο, 21,6×27,9 εκ., έγχρωμο", en: "Paperback, 8.5×11 in, color" },
    format: "paperback",
  },
  "letter-hardcover-standard-color": {
    podPackageId: "0850X1100FCSTDCW080CW444GXX",
    label: { el: "Σκληρό εξώφυλλο, 21,6×27,9 εκ., έγχρωμο", en: "Hardcover, 8.5×11 in, color" },
    format: "hardcover",
  },
  "a5-paperback-bw": {
    podPackageId: "0583X0827BWSTDPB060UW444MXX",
    label: { el: "Μαλακό εξώφυλλο, A5, ασπρόμαυρο", en: "Paperback, A5, black & white" },
    format: "paperback",
  },
  "6x9-paperback-bw": {
    podPackageId: "0600X0900BWSTDPB060UW444MXX",
    label: { el: "Μαλακό εξώφυλλο, 15,2×22,9 εκ., ασπρόμαυρο", en: "Paperback, 6×9 in, black & white" },
    format: "paperback",
  },
  "6x9-hardcover-bw": {
    podPackageId: "0600X0900BWSTDCW060UW444MXX",
    label: { el: "Σκληρό εξώφυλλο, 15,2×22,9 εκ., ασπρόμαυρο", en: "Hardcover, 6×9 in, black & white" },
    format: "hardcover",
  },
} as const;

export type PrintPackageKey = keyof typeof PRINT_PACKAGES;

export interface LuluAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  postcode: string;
  country_code: string;
  state_code?: string;
  phone_number: string;
  email?: string;
}

const base = () => process.env.LULU_API_BASE ?? "https://api.sandbox.lulu.com";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function token(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const basic = Buffer.from(`${requireEnv("LULU_CLIENT_KEY")}:${requireEnv("LULU_CLIENT_SECRET")}`).toString("base64");
  const res = await fetch(`${base()}/auth/realms/glasstree/protocol/openid-connect/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${basic}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`Lulu auth failed: ${res.status} ${await res.text()}`);
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

async function lulu<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: init.method ?? "GET",
    headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!res.ok) throw new Error(`Lulu ${init.method ?? "GET"} ${path} failed: ${res.status} ${await res.text()}`);
  return (await res.json()) as T;
}

function toCents(amount: string | number): number {
  return Math.round(Number(amount) * 100);
}

// What Lulu charges to print `quantity` copies, without shipping, using a Greek address for tax and routing.
export async function printCostCents(podPackageId: string, pageCount: number, quantity = 1): Promise<number> {
  const result = await lulu<{ line_item_costs: { total_cost_excl_tax: string }[] }>("/print-job-cost-calculations/", {
    method: "POST",
    body: {
      line_items: [{ page_count: pageCount, pod_package_id: podPackageId, quantity }],
      shipping_address: { city: "Athens", country_code: "GR", postcode: "10431", street1: "-", phone_number: "-" },
      shipping_option: "MAIL",
    },
  });
  return toCents(result.line_item_costs[0].total_cost_excl_tax);
}

// Starts Lulu's checks on an interior PDF. Poll interiorValidation(id) until status is VALIDATED or ERROR.
export async function validateInterior(sourceUrl: string, podPackageId: string) {
  return lulu<{ id: number; status: string }>("/validate-interior/", {
    method: "POST",
    body: { source_url: sourceUrl, pod_package_id: podPackageId },
  });
}

export async function interiorValidation(id: number) {
  return lulu<{ id: number; status: string; page_count: number | null; errors: string[] | null }>(`/validate-interior/${id}/`);
}

// The exact cover size (with spine) Lulu expects for this package and page count, in points.
export async function coverDimensions(podPackageId: string, pageCount: number) {
  return lulu<{ width: string; height: string; unit: string }>("/cover-dimensions/", {
    method: "POST",
    body: { pod_package_id: podPackageId, interior_page_count: pageCount, unit: "pt" },
  });
}

export async function validateCover(sourceUrl: string, podPackageId: string, pageCount: number) {
  return lulu<{ id: number; status: string }>("/validate-cover/", {
    method: "POST",
    body: { source_url: sourceUrl, pod_package_id: podPackageId, interior_page_count: pageCount },
  });
}

export interface PrintLine {
  externalId: string;
  title: string;
  podPackageId: string;
  interiorUrl: string;
  coverUrl: string;
  quantity: number;
}

// Places a print job. Lulu fetches the PDFs from the URLs, prints, and ships straight to the reader.
export async function createPrintJob(opts: {
  externalId: string;
  contactEmail: string;
  address: LuluAddress;
  lines: PrintLine[];
  shippingLevel?: "MAIL" | "PRIORITY_MAIL" | "GROUND" | "EXPEDITED" | "EXPRESS";
}) {
  return lulu<{ id: number; status: { name: string } }>("/print-jobs/", {
    method: "POST",
    body: {
      external_id: opts.externalId,
      contact_email: opts.contactEmail,
      shipping_level: opts.shippingLevel ?? "MAIL",
      shipping_address: opts.address,
      line_items: opts.lines.map((l) => ({
        external_id: l.externalId,
        title: l.title,
        quantity: l.quantity,
        printable_normalization: {
          pod_package_id: l.podPackageId,
          interior: { source_url: l.interiorUrl },
          cover: { source_url: l.coverUrl },
        },
      })),
    },
  });
}

export interface LuluPrintJobEvent {
  topic: string;
  data: {
    id: number;
    external_id: string;
    status: { name: string; messages?: Record<string, unknown> };
    line_items?: { tracking_urls?: string[] | null }[];
  };
}
