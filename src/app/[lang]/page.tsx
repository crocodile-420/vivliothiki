import Link from "next/link";
import { Icon } from "@/components/icons";
import { HeroScene } from "@/components/HeroScene";
import type { Locale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { siteCopy } from "@/i18n/site";
import { coverUrl } from "@/lib/books";
import { publishedBooks } from "@/lib/catalog";
import { localHref } from "@/lib/links";
import { formatPrice, splitSale } from "@/lib/pricing";

// The worked example in the pricing section: a 104-page color paperback (Lulu's quote: 8,89 €).
const EXAMPLE_PRICE_CENTS = 1990;
const EXAMPLE_PRINT_CENTS = 889;

export default async function Home({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = await params;
  const t = getDictionary(lang);
  const c = siteCopy(lang).home;
  const href = (h: string) => localHref(lang, h);
  const books = await publishedBooks({ limit: 6 });
  const commission = Number(process.env.PLATFORM_COMMISSION_PERCENT ?? 20);
  const sale = splitSale({ priceCents: EXAMPLE_PRICE_CENTS, printCostCents: EXAMPLE_PRINT_CENTS, commissionPercent: commission });
  const money = (cents: number) => formatPrice(cents, lang === "el" ? "el-GR" : "en-IE");
  const earn = `≈ ${money(sale.authorCents)}`;
  // The author keeps this share of what is left after VAT and costs.
  const share = 100 - commission;

  return (
    <div className="home">
      <section className="hero3d bleed">
        <HeroScene coverTitle={c.cover.title} coverLine={c.cover.line} chapter={c.cover.chapter} />
        <div className="hero3d-shade" aria-hidden />
        <div className="site-wrap hero3d-grid">
          <div className="hero3d-main">
            <p className="glass glass-eyebrow">{c.eyebrow}</p>
            <h1>
              {c.title} <em>{c.titleEm}</em>
            </h1>
            <p className="lede">{c.lede}</p>
            <ul className="hero3d-points">
              {c.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
            <div className="hero3d-ctas">
              <Link className="btn hero3d-cta" href={href("/dashboard")}>
                {c.cta} →
              </Link>
              <Link className="glass glass-go" href={href("/books")}>
                <span aria-hidden>→</span>
                {c.ctaShelves}
              </Link>
            </div>
          </div>
          <aside className="hero3d-side">
            <Link className="glass g-channels" href={href("#channels")}>
              <b>14</b>
              <span>{c.glass.channels}</span>
              <small>{c.glass.channelNames}</small>
            </Link>
            <Link className="glass g-share" href={href("#pricing")}>
              <small>{c.glass.share}</small>
              <span className="share-ring">
                <svg viewBox="0 0 120 120" aria-hidden>
                  <circle cx="60" cy="60" r="50" className="ring-track" />
                  <circle cx="60" cy="60" r="50" className="ring-arc" pathLength={100} strokeDasharray={`${share} 100`} />
                </svg>
                <b>{share}%</b>
              </span>
              <small>{c.glass.shareText}</small>
            </Link>
            <Link className="glass g-earn" href={href("#pricing")}>
              <small>{c.glass.example.replace("{price}", money(EXAMPLE_PRICE_CENTS))}</small>
              <strong>{earn}</strong>
              <span className="earn-bar" aria-hidden>
                <span style={{ width: `${Math.round((sale.authorCents / EXAMPLE_PRICE_CENTS) * 100)}%` }} />
              </span>
              <small>{c.glass.earn}</small>
            </Link>
          </aside>
        </div>
      </section>

      <div className="doors">
        {c.doors.map((d, i) => (
          <Link key={d.title} className={`door${i ? " door-readers" : ""}`} href={href(d.href)}>
            <span className="door-kicker">{d.kicker}</span>
            <span className="door-title">{d.title}</span>
            <ul>
              {d.points.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
            <span className="door-cta">{d.cta}</span>
          </Link>
        ))}
      </div>
      <section id="for-whom">
        <p className="eyebrow-dark">{c.forWhom.eyebrow}</p>
        <h2 className="section-title">{c.forWhom.title}</h2>
        <div className="audiences">
          {c.forWhom.cards.map((card, i) => (
            <Link key={card.title} className={`aud aud-${["light", "ivory", "dark"][i]}`} href={href(card.href)}>
              <strong>{card.title}</strong>
              <span>{card.text}</span>
              <AudienceArt kind={i} />
              <em>{card.cta}</em>
            </Link>
          ))}
        </div>
      </section>

      <section id="services">
        <p className="eyebrow-dark">{c.services.eyebrow}</p>
        <h2 className="section-title">{c.services.title}</h2>
        <div className="services">
          {c.services.items.map((s) => (
            <div key={s.title} className="service">
              <span className="svc-ic">
                <Icon name={s.icon} size={26} />
              </span>
              <strong>{s.title}</strong>
              <p>{s.text}</p>
              <Link className="btn pill" href={href(s.href)}>
                {s.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      <Link className="sell-banner" href={href("/dashboard")}>
        <div>
          <strong>{c.sell.title}</strong>
          <p>{c.sell.text}</p>
          <span className="btn-light">{c.sell.cta}</span>
        </div>
        <div className="sell-mock" aria-hidden>
          <div className="sm-cover" />
          <div className="sm-lines">
            <b>{c.sell.mockTitle}</b>
            <span>{c.sell.mockPrice}</span>
            <i>{c.sell.mockBuy}</i>
          </div>
        </div>
      </Link>

      <section id="channels">
        <p className="eyebrow-dark">{c.channels.eyebrow}</p>
        <h2 className="section-title">{c.channels.title}</h2>
        <p className="section-lede">{c.channels.lede}</p>
        <div className="channels">
          {c.channels.groups.map((g) => (
            <div key={g.title} className="channel-group">
              <strong>{g.title}</strong>
              <span>{g.text}</span>
              <ul>
                {g.names.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <Link className="channels-cta" href={href("/dashboard")}>
          {c.channels.cta}
        </Link>
      </section>

      <section id="how">
        <p className="eyebrow-dark">{c.how.eyebrow}</p>
        <h2 className="section-title">{c.how.title}</h2>
        <p className="section-lede">{c.how.lede}</p>
        <ol className="how">
          {c.how.steps.map((s, i) => (
            <li key={s.title} className="how-row">
              <div className="how-text">
                <span className="how-n">
                  {c.how.step} {i + 1}
                </span>
                <strong>{s.title}</strong>
                <p>{s.text}</p>
              </div>
              <div className="how-art" aria-hidden>
                <div className="how-mock">
                  {s.mock.map((line, j) => (
                    <span key={line} className={j === s.mock.length - 1 ? "ok" : j === 1 && i === 1 ? "big" : "file"}>
                      {line.replace("{earn}", earn)}
                    </span>
                  ))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section id="pricing" className="pricing">
        <div>
          <p className="eyebrow-dark">{c.pricing.eyebrow}</p>
          <h2 className="section-title">{c.pricing.title}</h2>
          <p className="section-lede">{c.pricing.lede}</p>
          <Link className="btn" href={href("/dashboard")}>
            {t.nav.publish}
          </Link>
        </div>
        <div className="panel receipt">
          <p className="receipt-head">{c.pricing.example}</p>
          <dl>
            <dt>{c.pricing.labels.price}</dt>
            <dd>{money(EXAMPLE_PRICE_CENTS)}</dd>
            <dt>{c.pricing.labels.vat}</dt>
            <dd>−{money(sale.vatCents)}</dd>
            <dt>{c.pricing.labels.print}</dt>
            <dd>−{money(sale.printCostCents)}</dd>
            <dt>{c.pricing.labels.fee}</dt>
            <dd>−{money(sale.paymentFeeCents)}</dd>
            <dt>
              {c.pricing.labels.commission} {commission}%
            </dt>
            <dd>−{money(sale.platformCents)}</dd>
            <dt className="total">{c.pricing.labels.total}</dt>
            <dd className="total">{earn}</dd>
          </dl>
          <p className="receipt-note">{c.pricing.note}</p>
        </div>
      </section>

      {books.length > 0 && (
        <section>
          <p className="eyebrow-dark">{c.shelf.eyebrow}</p>
          <div className="shelf-head">
            <h2 className="section-title">{c.shelf.title}</h2>
            <Link href={href("/books")}>{c.shelf.all}</Link>
          </div>
          <div className="shelf-row">
            {books.map((b) => {
              const cover = coverUrl(b.cover_image_path);
              return (
                <Link key={b.id} href={href(`/books/${b.slug}`)} className="shelf-book" title={b.title}>
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cover} alt={b.title} />
                  ) : (
                    <span>{b.title}</span>
                  )}
                </Link>
              );
            })}
          </div>
          <div className="shelf-board" aria-hidden />
        </section>
      )}

      <div className="facts">
        {c.facts.map(([n, label]) => (
          <div key={label}>
            <b>{n}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>

      <section id="trust">
        <p className="eyebrow-dark">{c.trust.eyebrow}</p>
        <h2 className="section-title">{c.trust.title}</h2>
        <div className="trust">
          {c.trust.items.map(([title, text]) => (
            <div key={title} className="panel">
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="faq">
        <p className="eyebrow-dark">{c.faq.eyebrow}</p>
        <h2 className="section-title">{c.faq.title}</h2>
        <div className="faq">
          {c.faq.items.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

function AudienceArt({ kind }: { kind: number }) {
  const gold = "var(--gold)";
  return (
    <svg className="aud-art" viewBox="0 0 200 120" aria-hidden>
      {kind === 0 && (
        <>
          <path d="M60 100 140 20l18 18-80 80H60z" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
          <path d="M130 30l18 18" stroke="currentColor" strokeWidth="3" />
          <path d="M40 108h120" stroke={gold} strokeWidth="3" strokeLinecap="round" />
          <circle cx="150" cy="22" r="4" fill={gold} />
          <circle cx="168" cy="40" r="3" fill={gold} />
        </>
      )}
      {kind === 1 && (
        <>
          <g fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round">
            <rect x="40" y="40" width="34" height="68" />
            <rect x="82" y="20" width="36" height="88" />
            <rect x="126" y="52" width="34" height="56" />
          </g>
          <path d="M30 108h140" stroke={gold} strokeWidth="3" strokeLinecap="round" />
          <path d="M90 34h20M90 46h20M90 58h20M48 54h18M134 66h18" stroke={gold} strokeWidth="2" />
        </>
      )}
      {kind === 2 && (
        <>
          <circle cx="100" cy="62" r="44" fill="none" stroke="currentColor" strokeWidth="3" />
          <path d="M56 62h88M100 18c-18 24-18 64 0 88M100 18c18 24 18 64 0 88" fill="none" stroke="currentColor" strokeWidth="2" />
          <circle cx="100" cy="62" r="54" fill="none" stroke={gold} strokeWidth="1.5" strokeDasharray="3 6" />
        </>
      )}
    </svg>
  );
}
