"use client";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/el";
import { PT_PER_INCH, trimFromPodPackage } from "@/lib/cover";
import { normalizeIsbn13 } from "@/lib/ean13";
import { INTERIOR_TEMPLATES, type InteriorTemplateKey } from "@/lib/interiorTemplates";
import { PRINT_PACKAGES, type PrintPackageKey } from "@/lib/lulu";
import { type Manuscript, parseManuscriptHtml } from "@/lib/manuscript";

// The fewest pages the printer binds: paperbacks 32, hardcovers 24. Blank pages fill up to it.
const MIN_PAGES = { paperback: 32, hardcover: 24 } as const;

interface Props {
  lang: "el" | "en";
  kind: PrintPackageKey | "ebook";
  bookId: string;
  bookLanguage: string;
  title: string;
  subtitle: string;
  author: string;
  isbn: () => string;
  text: Dictionary["manuscript"];
  onUse: (file: File, pageCount: number | null) => void;
}

const fontCache = new Map<string, Promise<Uint8Array>>();
const loadFont = (name: string) => {
  if (!fontCache.has(name)) fontCache.set(name, fetch(`/fonts/${name}`).then(async (r) => new Uint8Array(await r.arrayBuffer())));
  return fontCache.get(name)!;
};

// Turns the author's Word file into the print interior (PDF) or the ebook (EPUB), in the browser.
export function ManuscriptTool({ lang, kind, bookId, bookLanguage, title, subtitle, author, isbn, text, onUse }: Props) {
  const [manuscript, setManuscript] = useState<Manuscript | null>(null);
  const [template, setTemplate] = useState<InteriorTemplateKey>("classic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ file: File; url: string; pages: number | null } | null>(null);
  const ebook = kind === "ebook";

  useEffect(() => {
    if (result) return () => URL.revokeObjectURL(result.url);
  }, [result]);

  async function read(file: File) {
    setError(null);
    setResult(null);
    setBusy(true);
    try {
      const mammoth = (await import("mammoth")).default;
      const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
      const m = parseManuscriptHtml(value);
      if (!m.chapters.length) throw new Error(text.empty);
      setManuscript(m);
    } catch (err) {
      setManuscript(null);
      setError(err instanceof Error && err.message === text.empty ? text.empty : text.unreadable);
    } finally {
      setBusy(false);
    }
  }

  async function build() {
    if (!manuscript) return;
    setBusy(true);
    setError(null);
    try {
      const rawIsbn = isbn().trim();
      const cleanIsbn = rawIsbn && normalizeIsbn13(rawIsbn) ? rawIsbn : undefined;
      const base = (title || "book").replace(/[^\p{L}\p{N}]+/gu, "-").slice(0, 60);
      // The PDF and EPUB libraries are large, so they load only when needed.
      if (ebook) {
        const { buildEpub } = await import("@/lib/epub");
        const bytes = await buildEpub({ manuscript, title, subtitle, author, lang: bookLanguage, isbn: cleanIsbn, identifier: bookId });
        const file = new File([bytes as BlobPart], `${base}.epub`, { type: "application/epub+zip" });
        setResult({ file, url: URL.createObjectURL(file), pages: null });
      } else {
        const { buildInteriorPdf } = await import("@/lib/interiorPdf");
        const pkg = PRINT_PACKAGES[kind];
        const trim = trimFromPodPackage(pkg.podPackageId);
        const t = INTERIOR_TEMPLATES[template];
        const [regular, italic, bold, display] = await Promise.all([t.fonts.regular, t.fonts.italic, t.fonts.bold, t.fonts.display].map((f) => (f ? loadFont(f) : Promise.resolve(undefined))));
        const { pdf, pageCount } = await buildInteriorPdf({
          manuscript,
          template,
          trim: { widthPt: trim.widthIn * PT_PER_INCH, heightPt: trim.heightIn * PT_PER_INCH },
          title,
          subtitle,
          author,
          isbn: cleanIsbn,
          lang: bookLanguage === "el" ? "el" : "en",
          minPages: MIN_PAGES[pkg.format],
          fonts: { regular: regular!, italic, bold: bold!, display: display! },
        });
        const file = new File([pdf as BlobPart], `${base}-interior.pdf`, { type: "application/pdf" });
        setResult({ file, url: URL.createObjectURL(file), pages: pageCount });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const chapters = manuscript?.chapters.filter((c) => c.title.length).length ?? 0;
  return (
    <div className="panel grid gap-3 sm:col-span-2">
      <div>
        <h4 className="font-semibold">{ebook ? text.titleEbook : text.titlePrint}</h4>
        <p className="text-sm text-muted">{text.help}</p>
      </div>
      <label className="label">
        {text.file}
        <input type="file" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} className="mt-1 block text-sm" />
      </label>
      {manuscript && (
        <p className="text-sm">
          {text.found.replace("{chapters}", String(chapters)).replace("{words}", manuscript.words.toLocaleString(lang === "el" ? "el-GR" : "en-GB"))}
        </p>
      )}
      {manuscript && !ebook && (
        <label className="label">
          {text.template}
          <select value={template} onChange={(e) => {
              setTemplate(e.target.value as InteriorTemplateKey);
              setResult(null);
            }} className="field">
            {Object.values(INTERIOR_TEMPLATES).map((t) => (
              <option key={t.key} value={t.key}>
                {t.label[lang]}
              </option>
            ))}
          </select>
        </label>
      )}
      {manuscript && (
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="btn" disabled={busy} onClick={build}>
            {busy ? text.building : ebook ? text.buildEbook : text.buildPrint}
          </button>
          {result && (
            <>
              <a className="underline" href={result.url} target="_blank" rel="noreferrer" download={result.file.name}>
                {text.preview}
              </a>
              <button type="button" className="btn-ghost" onClick={() => onUse(result.file, result.pages)}>
                {text.use}
              </button>
            </>
          )}
        </div>
      )}
      {result?.pages != null && <p className="text-sm text-muted">{text.pages.replace("{pages}", String(result.pages))}</p>}
      {busy && !manuscript && <p className="text-sm text-muted">{text.reading}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
