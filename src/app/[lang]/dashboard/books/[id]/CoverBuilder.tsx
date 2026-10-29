"use client";
import { useEffect, useState } from "react";
import type { Dictionary } from "@/i18n/el";
import { type CoverSize, coverLayout, PT_PER_INCH } from "@/lib/cover";
import { COVER_TEMPLATES, type CoverTemplateKey } from "@/lib/coverTemplates";
import { normalizeIsbn13 } from "@/lib/ean13";
import type { PrintPackageKey } from "@/lib/lulu";
import { coverSizeFor } from "../../actions";

const PRINT_DPI = 300;
const MIN_DPI = 200;

interface Props {
  lang: "el" | "en";
  kind: PrintPackageKey;
  pageCount: number | null;
  defaultTitle: string;
  defaultAuthor: string;
  text: Dictionary["coverBuilder"];
  onUse: (file: File) => void;
}

async function loadImage(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  await img.decode();
  return img;
}

// Crops the image to the front artwork's shape (centered, like object-fit: cover) at print resolution.
async function prepareFrontImage(file: File, widthPt: number, heightPt: number, grayscale: boolean) {
  const img = await loadImage(file);
  const target = widthPt / heightPt;
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const sw = srcRatio > target ? img.naturalHeight * target : img.naturalWidth;
  const sh = srcRatio > target ? img.naturalHeight : img.naturalWidth / target;
  const effectiveDpi = (sw / widthPt) * PT_PER_INCH;
  const outW = Math.round(Math.min(sw, (widthPt / PT_PER_INCH) * PRINT_DPI));
  const outH = Math.round(outW / target);
  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d")!;
  if (grayscale) ctx.filter = "grayscale(1) contrast(1.1)";
  ctx.drawImage(img, (img.naturalWidth - sw) / 2, (img.naturalHeight - sh) / 2, sw, sh, 0, 0, outW, outH);
  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
  return { jpeg: new Uint8Array(await blob.arrayBuffer()), effectiveDpi };
}

export function CoverBuilder({ lang, kind, pageCount, defaultTitle, defaultAuthor, text, onUse }: Props) {
  const [template, setTemplate] = useState<CoverTemplateKey>("classic");
  const t = COVER_TEMPLATES[template];
  const [background, setBackground] = useState(t.background);
  const [accent, setAccent] = useState(t.accent);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lowDpi, setLowDpi] = useState<number | null>(null);
  const [result, setResult] = useState<{ url: string; bytes: Uint8Array; size: CoverSize } | null>(null);

  useEffect(() => {
    setBackground(COVER_TEMPLATES[template].background);
    setAccent(COVER_TEMPLATES[template].accent);
  }, [template]);
  useEffect(() => () => { if (result) URL.revokeObjectURL(result.url); }, [result]);

  async function build(form: HTMLFormElement) {
    const data = new FormData(form);
    const isbn = String(data.get("cb-isbn") ?? "").trim();
    if (isbn && !normalizeIsbn13(isbn)) return setError(text.isbnInvalid);
    if (!pageCount) return setError(text.needsPages);
    setBusy(true);
    setError(null);
    setLowDpi(null);
    try {
      const [{ buildCoverPdf }, size, regular, bold] = await Promise.all([
        import("@/lib/coverPdf"),
        coverSizeFor(kind, pageCount),
        fetch("/fonts/Literata_400Regular.ttf").then((r) => r.arrayBuffer()),
        fetch("/fonts/Literata_700Bold.ttf").then((r) => r.arrayBuffer()),
      ]);
      const art = coverLayout(size).frontArt;
      const image = data.get("cb-image");
      let frontImageJpeg: Uint8Array | undefined;
      if (t.usesImage && image instanceof File && image.size > 0) {
        const prepared = await prepareFrontImage(image, art.w, art.h, t.imageFilter === "grayscale");
        frontImageJpeg = prepared.jpeg;
        if (prepared.effectiveDpi < MIN_DPI) setLowDpi(Math.round(prepared.effectiveDpi));
      }
      const bytes = await buildCoverPdf({
        size,
        template,
        title: String(data.get("cb-title") ?? defaultTitle),
        subtitle: String(data.get("cb-subtitle") ?? "") || undefined,
        author: String(data.get("cb-author") ?? defaultAuthor),
        backText: String(data.get("cb-back") ?? ""),
        isbn: isbn || undefined,
        background,
        accent,
        frontImageJpeg,
        fonts: { regular: new Uint8Array(regular), bold: new Uint8Array(bold) },
      });
      const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: "application/pdf" }));
      setResult({ url, bytes, size });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const inches = (pt: number) => (pt / PT_PER_INCH).toFixed(3);
  const cm = (pt: number) => ((pt / PT_PER_INCH) * 2.54).toFixed(1);

  return (
    // A nested <form> isn't allowed inside the edition form, so this is a fieldset handled by its button.
    <fieldset className="panel grid gap-4 sm:col-span-2" id="cover-builder">
      <legend className="px-1 font-semibold">{text.title}</legend>
      <div className="label">
        {text.template}
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {Object.values(COVER_TEMPLATES).map((tpl) => (
            <label key={tpl.key} className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm ${template === tpl.key ? "border-accent" : "border-line"}`}>
              <input type="radio" name="cb-template" value={tpl.key} checked={template === tpl.key} onChange={() => setTemplate(tpl.key)} />
              <span aria-hidden className="h-10 w-8 shrink-0 rounded-sm border border-line" style={{ background: tpl.background, boxShadow: `inset 0 -6px 0 ${tpl.accent}` }} />
              {tpl.label[lang]}
            </label>
          ))}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="label">
          {lang === "el" ? "Τίτλος" : "Title"}
          <input name="cb-title" id="cb-title" defaultValue={defaultTitle} className="field" />
        </label>
        <label className="label">
          {text.subtitle}
          <input name="cb-subtitle" id="cb-subtitle" className="field" />
        </label>
        <label className="label">
          {text.author}
          <input name="cb-author" id="cb-author" defaultValue={defaultAuthor} className="field" />
        </label>
        <label className="label">
          {text.isbn}
          <input name="cb-isbn" id="cb-isbn" inputMode="numeric" placeholder="978-…" className="field" />
        </label>
        <label className="label sm:col-span-2">
          {text.backText}
          <textarea name="cb-back" id="cb-back" rows={5} className="field" />
        </label>
        {t.usesImage && (
          <label className="label sm:col-span-2">
            {text.frontImage}
            <input name="cb-image" id="cb-image" type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block text-sm" />
          </label>
        )}
        <label className="label">
          {text.background}
          <input type="color" id="cb-bg" value={background} onChange={(e) => setBackground(e.target.value)} className="mt-1 block h-9 w-16" />
        </label>
        <label className="label">
          {text.accent}
          <input type="color" id="cb-accent" value={accent} onChange={(e) => setAccent(e.target.value)} className="mt-1 block h-9 w-16" />
        </label>
      </div>
      <div>
        <button type="button" className="btn" disabled={busy} onClick={(e) => build(e.currentTarget.form!)}>
          {busy ? text.building : text.build}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        {lowDpi != null && (
          <p className="mt-2 text-sm text-accent">
            {text.lowRes} {MIN_DPI} dpi ({lowDpi} dpi).
          </p>
        )}
      </div>
      {result && (
        <div className="grid gap-3">
          <p className="text-sm text-muted">
            {text.size}: {cm(result.size.widthPt)} × {cm(result.size.heightPt)} cm ({inches(result.size.widthPt)} × {inches(result.size.heightPt)} in)
            {result.size.source === "estimate" && <> · {text.estimate}</>}
          </p>
          <iframe src={result.url} title={text.title} className="aspect-[16/10] w-full rounded-md border border-line bg-white" />
          <div>
            <button type="button" className="btn" onClick={() => onUse(new File([result.bytes as BlobPart], "cover.pdf", { type: "application/pdf" }))}>
              {text.use}
            </button>
          </div>
        </div>
      )}
    </fieldset>
  );
}
