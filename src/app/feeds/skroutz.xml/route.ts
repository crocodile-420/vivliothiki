import { loadFeedProducts, xmlResponse } from "@/lib/feedData";
import { skroutzFeed } from "@/lib/feeds";

// Built on request; the response is cached for an hour (see xmlResponse).
export const dynamic = "force-dynamic";

export async function GET() {
  return xmlResponse(skroutzFeed(await loadFeedProducts(["skroutz"])));
}
