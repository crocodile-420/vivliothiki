import { loadFeedProducts, xmlResponse } from "@/lib/feedData";
import { bestpriceFeed } from "@/lib/feeds";

// Built on request; the response is cached for an hour (see xmlResponse).
export const dynamic = "force-dynamic";

export async function GET() {
  return xmlResponse(bestpriceFeed(await loadFeedProducts(["bestprice"])));
}
