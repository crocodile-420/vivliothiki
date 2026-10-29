"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import type { Dictionary } from "@/i18n/el";
import type { PrintPackageKey } from "@/lib/lulu";
import { saveEdition, type EditionInput } from "../../actions";
import { CoverBuilder } from "./CoverBuilder";
import { ManuscriptTool } from "./ManuscriptTool";
import { uploadFile } from "./upload";

interface Props {
  lang: "el" | "en";
  bookId: string;
  userId: string;
  packages: { key: string; label: string }[];
  text: Dictionary["editor"];
  coverText: Dictionary["coverBuilder"];
  manuscriptText: Dictionary["manuscript"];
  bookTitle: string;
  bookSubtitle: string;
  bookLanguage: string;
  authorName: string;
}

export function EditionForm({ lang, bookId, userId, packages, text, coverText, manuscriptText, bookTitle, bookSubtitle, bookLanguage, authorName }: Props) {
  const router = useRouter();
  const [kind, setKind] = useState(packages[0]?.key ?? "ebook");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEbook = kind === "ebook";
  const [pageCount, setPageCount] = useState<number | null>(null);
  const [builtCover, setBuiltCover] = useState<File | null>(null);
  const [showBuilder, setShowBuilder] = useState(false);
  // A file made from the author's Word document, used in place of an upload.
  const [builtBody, setBuiltBody] = useState<File | null>(null);
  const [showManuscript, setShowManuscript] = useState(false);
  const isbnRef = useRef<HTMLInputElement>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    const file = (name: string) => {
      const f = form.get(name);
      return f instanceof File && f.size > 0 ? f : null;
    };
    try {
      const interior = file("interior") ?? (isEbook ? null : builtBody);
      const cover = file("cover") ?? builtCover;
      const ebook = file("ebook") ?? (isEbook ? builtBody : null);
      const input: EditionInput = {
        bookId,
        kind: kind as EditionInput["kind"],
        priceCents: Math.round(Number(String(form.get("price")).replace(",", ".")) * 100),
        pageCount: isEbook ? null : Number(form.get("pageCount")),
        isbn: String(form.get("isbn") ?? "") || null,
        interiorPath: interior ? await uploadFile("book-files", userId, bookId, interior, "interior") : null,
        coverPath: cover ? await uploadFile("book-files", userId, bookId, cover, "cover") : null,
        ebookPath: ebook ? await uploadFile("book-files", userId, bookId, ebook, "ebook") : null,
      };
      await saveEdition(lang, input);
      e.currentTarget?.reset();
      setBuiltCover(null);
      setShowBuilder(false);
      setBuiltBody(null);
      setShowManuscript(false);
      setPageCount(null);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const manuscriptLink = builtBody ? (
    <span className="mt-1 block text-sm font-normal text-muted">{manuscriptText.using}</span>
  ) : (
    <button type="button" className="mt-1 text-sm font-normal text-accent underline" onClick={() => setShowManuscript((v) => !v)}>
      {manuscriptText.open}
    </button>
  );

  return (
    <form onSubmit={onSubmit} className="panel grid gap-4 sm:grid-cols-2">
      <h3 className="font-semibold sm:col-span-2">{text.addEdition}</h3>
      <label className="label sm:col-span-2">
        {text.printPackage}
        <select
          value={kind}
          onChange={(e) => {
            setKind(e.target.value);
            setBuiltBody(null); // a PDF is made for one trim size
          }}
          className="field"
        >
          {packages.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
          <option value="ebook">{text.ebook}</option>
        </select>
      </label>
      <label className="label">
        {text.price}
        <input name="price" required inputMode="decimal" pattern="[0-9]+([.,][0-9]{1,2})?" className="field" />
      </label>
      {!isEbook && (
        <label className="label">
          {text.pageCount}
          <input
            name="pageCount"
            type="number"
            min={2}
            max={800}
            required
            value={pageCount ?? ""}
            onChange={(e) => setPageCount(Number(e.target.value) || null)}
            className="field"
          />
        </label>
      )}
      <label className="label">
        {text.isbn}
        <input name="isbn" ref={isbnRef} className="field" />
      </label>
      {isEbook ? (
        <label className="label sm:col-span-2">
          {text.ebookFile}
          <input name="ebook" type="file" accept=".epub,application/epub+zip,application/pdf" required={!builtBody} className="mt-1 block text-sm" />
          {manuscriptLink}
        </label>
      ) : (
        <>
          <label className="label">
            {text.interiorPdf}
            <input name="interior" type="file" accept="application/pdf" required={!builtBody} className="mt-1 block text-sm" />
            {manuscriptLink}
          </label>
          <label className="label">
            {text.coverPdf}
            <input name="cover" type="file" accept="application/pdf" required={!builtCover} className="mt-1 block text-sm" />
            {builtCover ? (
              <span className="mt-1 block text-sm font-normal text-muted">{coverText.using}</span>
            ) : (
              <button type="button" className="mt-1 text-sm font-normal text-accent underline" onClick={() => setShowBuilder((v) => !v)}>
                {coverText.open}
              </button>
            )}
          </label>
          {showBuilder && !builtCover && (
            <CoverBuilder
              lang={lang}
              kind={kind as PrintPackageKey}
              pageCount={pageCount}
              defaultTitle={bookTitle}
              defaultAuthor={authorName}
              text={coverText}
              onUse={(f) => {
                setBuiltCover(f);
                setShowBuilder(false);
              }}
            />
          )}
        </>
      )}
      {showManuscript && !builtBody && (
        <ManuscriptTool
          lang={lang}
          kind={kind as PrintPackageKey | "ebook"}
          bookId={bookId}
          bookLanguage={bookLanguage}
          title={bookTitle}
          subtitle={bookSubtitle}
          author={authorName}
          isbn={() => isbnRef.current?.value ?? ""}
          text={manuscriptText}
          onUse={(f, pages) => {
            setBuiltBody(f);
            if (pages) setPageCount(pages);
            setShowManuscript(false);
          }}
        />
      )}
      <div className="sm:col-span-2">
        <button className="btn" disabled={busy}>
          {busy ? "…" : text.save}
        </button>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </form>
  );
}
