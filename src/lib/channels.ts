// The stores and marketplaces a book can be sold through besides our own bookstore.
// "feed" channels read our product feeds and send buyers to the book's page here, so they go live
// as soon as the author turns them on. "managed" channels are listed by hand from Vivliothiki's
// seller accounts, so they start as a request that an admin completes.
import type { EditionFormat } from "./books";

export type ChannelKey =
  | "google_shopping" | "meta_shop" | "skroutz" | "bestprice"
  | "public" | "shopflix" | "amazon" | "ebay"
  | "politeia" | "ianos" | "protoporia"
  | "google_play" | "apple_books" | "kobo";
export type ChannelStatus = "requested" | "listed" | "withdrawing" | "paused" | "rejected";
// How the author's page groups them: promotion of our book page, marketplaces, Greek bookshops, ebook stores.
export type ChannelGroup = "promote" | "marketplace" | "bookstore" | "ebook";

export interface Channel {
  key: ChannelKey;
  name: string;
  group: ChannelGroup;
  mode: "feed" | "managed";
  formats: "print" | "ebook" | "all";
  greek?: boolean;
  // Path of the product feed this channel reads, for feed channels.
  feed?: string;
}

export const CHANNELS: Channel[] = [
  { key: "skroutz", name: "Skroutz", group: "promote", mode: "feed", formats: "print", greek: true, feed: "/feeds/skroutz.xml" },
  { key: "bestprice", name: "BestPrice", group: "promote", mode: "feed", formats: "print", greek: true, feed: "/feeds/bestprice.xml" },
  { key: "google_shopping", name: "Google Shopping", group: "promote", mode: "feed", formats: "all", feed: "/feeds/google.xml" },
  { key: "meta_shop", name: "Facebook & Instagram Shop", group: "promote", mode: "feed", formats: "all", feed: "/feeds/google.xml" },
  { key: "public", name: "Public", group: "marketplace", mode: "managed", formats: "print", greek: true },
  { key: "shopflix", name: "Shopflix", group: "marketplace", mode: "managed", formats: "print", greek: true },
  { key: "amazon", name: "Amazon", group: "marketplace", mode: "managed", formats: "print" },
  { key: "ebay", name: "eBay", group: "marketplace", mode: "managed", formats: "print" },
  { key: "politeia", name: "Πολιτεία", group: "bookstore", mode: "managed", formats: "print", greek: true },
  { key: "ianos", name: "Ιανός", group: "bookstore", mode: "managed", formats: "print", greek: true },
  { key: "protoporia", name: "Πρωτοπορία", group: "bookstore", mode: "managed", formats: "print", greek: true },
  { key: "google_play", name: "Google Play Books", group: "ebook", mode: "managed", formats: "ebook" },
  { key: "apple_books", name: "Apple Books", group: "ebook", mode: "managed", formats: "ebook" },
  { key: "kobo", name: "Kobo", group: "ebook", mode: "managed", formats: "ebook" },
];

export const CHANNEL_GROUPS: ChannelGroup[] = ["promote", "marketplace", "bookstore", "ebook"];

export const channel = (key: string): Channel | undefined => CHANNELS.find((c) => c.key === key);

// Whether a book with these formats can go on the channel.
export function channelFits(c: Channel, formats: EditionFormat[]): boolean {
  if (c.formats === "all") return formats.length > 0;
  return formats.some((f) => (c.formats === "ebook" ? f === "ebook" : f !== "ebook"));
}

// Feed channels have nothing for an admin to do, so a request is already live.
export function effectiveStatus(c: Channel, status: ChannelStatus): ChannelStatus {
  return c.mode === "feed" && status === "requested" ? "listed" : status;
}
