import { siteUrl } from "@/lib/env";
import { loadFeedProducts, xmlResponse } from "@/lib/feedData";
import { googleFeed } from "@/lib/feeds";

// Built on request; the response is cached for an hour (see xmlResponse).
export const dynamic = "force-dynamic";

// Read by Google Merchant Center and by Meta's catalog for Facebook and Instagram shops.
export async function GET() {
  return xmlResponse(googleFeed(await loadFeedProducts(["google_shopping", "meta_shop"]), { title: "Vivliothiki Books", siteUrl: siteUrl() }));
}
