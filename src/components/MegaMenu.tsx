"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { MenuEntry, SiteCopy } from "@/i18n/site";
import { localHref } from "@/lib/links";
import { Icon } from "./icons";


export function MegaMenu({ lang, copy }: { lang: Locale; copy: Pick<SiteCopy, "menu" | "soon" | "menuLabel" | "openMenu"> }) {
  const [open, setOpen] = useState<number | null>(null);
  const [mobile, setMobile] = useState(false);
  const nav = useRef<HTMLElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(null);
    setMobile(false);
  }, [pathname]);
  useEffect(() => {
    const close = (e: Event) => {
      // The toggle sits outside the nav, so clicks on it count as inside too.
      const inside = e.target instanceof Element && (nav.current?.contains(e.target) || e.target.closest(".menu-toggle"));
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !inside) {
        setOpen(null);
        setMobile(false);
      }
    };
    document.addEventListener("click", close);
    document.addEventListener("keydown", close);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", close);
    };
  }, []);

  const close = () => {
    setOpen(null);
    setMobile(false);
  };

  return (
    <>
      <nav ref={nav} className={`mega${mobile ? " open" : ""}`} id="main-menu" aria-label={copy.menuLabel}>
        {copy.menu.map((entry: MenuEntry, i) =>
          "href" in entry ? (
            <Link key={entry.label} className="mega-top" href={localHref(lang, entry.href)} onClick={close}>
              {entry.label}
            </Link>
          ) : (
            <div key={entry.label} className="mega-group">
              <button className="mega-top" aria-expanded={open === i} aria-controls={`mega-${i}`} onClick={() => setOpen(open === i ? null : i)}>
                {entry.label}
                <Icon name="chevron" size={14} />
              </button>
              <div className="mega-panel" id={`mega-${i}`} hidden={open !== i}>
                <div className="mega-inner">
                  <div className="mega-cols">
                    {entry.columns.map((col) => (
                      <div key={col.heading}>
                        <h4>{col.heading}</h4>
                        {col.items?.map((item) => {
                          const body = (
                            <>
                              <Icon name={item.icon} />
                              <strong>
                                {item.title}
                                {!item.href && <em className="soon">{copy.soon}</em>}
                              </strong>
                              <span>{item.text}</span>
                            </>
                          );
                          return item.href ? (
                            <Link key={item.title} className="mega-item" href={localHref(lang, item.href)} onClick={close}>
                              {body}
                            </Link>
                          ) : (
                            <div key={item.title} className="mega-item is-soon">
                              {body}
                            </div>
                          );
                        })}
                        {col.links && (
                          <div className="mega-links">
                            {col.links.map(([label, href]) => (
                              <Link key={label} href={localHref(lang, href)} onClick={close}>
                                {label}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mega-side">
                    {entry.features.map((f) => (
                      <Link key={f.art} className="feature" href={localHref(lang, f.href)} onClick={close}>
                        <div className={`feature-art tone-${f.tone}`}>{f.art}</div>
                        <small>{f.kicker}</small>
                        <span>{f.text}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ),
        )}
      </nav>
      <button
        className="icon-btn menu-toggle"
        aria-expanded={mobile}
        aria-controls="main-menu"
        aria-label={copy.openMenu}
        onClick={() => setMobile(!mobile)}
      >
        <Icon name="menu" size={22} />
      </button>
    </>
  );
}
