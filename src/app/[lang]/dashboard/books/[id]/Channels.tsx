import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/el";
import type { EditionFormat } from "@/lib/books";
import { CHANNEL_GROUPS, CHANNELS, type ChannelStatus, channelFits, effectiveStatus } from "@/lib/channels";
import { requestChannel, withdrawChannel } from "../../actions";

export interface ChannelRow {
  channel: string;
  status: ChannelStatus;
  listing_url: string | null;
  note: string;
}

// Where else the book is sold. Works at any stage: choices made before approval start once it's published.
export function Channels({ lang, bookId, published, formats, rows, text }: {
  lang: Locale;
  bookId: string;
  published: boolean;
  formats: EditionFormat[];
  rows: ChannelRow[];
  text: Dictionary["channels"];
}) {
  const byKey = new Map(rows.map((r) => [r.channel, r]));
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">{text.title}</h2>
        <p className="mt-1 text-sm text-muted">{text.help}</p>
        {!published && <p className="mt-1 text-sm text-muted">{text.afterPublish}</p>}
      </div>
      {CHANNEL_GROUPS.map((group) => (
        <div key={group}>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">{text.groups[group]}</h3>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {CHANNELS.filter((c) => c.group === group).map((c) => {
              const row = byKey.get(c.key);
              const status = row && effectiveStatus(c, row.status);
              const fits = channelFits(c, formats);
              const on = status === "requested" || status === "listed" || status === "withdrawing";
              return (
                <div key={c.key} className="panel flex flex-col gap-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <strong>{c.name}</strong>
                    {status && <span className={`channel-status is-${status}`}>{text.status[status]}</span>}
                  </div>
                  <p className="text-muted">{text.about[c.key]}</p>
                  {row?.note && status === "rejected" && <p className="text-red-600">{row.note}</p>}
                  <div className="mt-auto flex flex-wrap items-center gap-3">
                    {!fits && !on ? (
                      <span className="text-muted">{c.formats === "ebook" ? text.notFitEbook : text.notFit}</span>
                    ) : on ? (
                      status !== "withdrawing" && (
                        <form action={withdrawChannel.bind(null, lang, bookId, c.key)}>
                          <button className="btn-ghost">{text.turnOff}</button>
                        </form>
                      )
                    ) : (
                      <form action={requestChannel.bind(null, lang, bookId, c.key)}>
                        <button className="btn">{text.turnOn}</button>
                      </form>
                    )}
                    {row?.listing_url && status === "listed" && (
                      <a className="underline" href={row.listing_url} target="_blank" rel="noreferrer">
                        {text.view}
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
