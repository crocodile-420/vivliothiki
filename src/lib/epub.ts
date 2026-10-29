// Builds an EPUB 3 ebook (with an EPUB 2 table of contents for older readers) from a manuscript.
import JSZip from "jszip";
import { type Block, dataUri, type Manuscript, plain, type Run } from "./manuscript";

export interface EpubInput {
  manuscript: Manuscript;
  title: string;
  subtitle?: string;
  author: string;
  lang: string; // the book's language, e.g. "el"
  isbn?: string;
  identifier: string; // stable id when there's no ISBN, such as the book's id
  coverJpeg?: Uint8Array;
  modified?: Date;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const runsHtml = (runs: Run[]) =>
  runs
    .map((r) => {
      let h = esc(r.text);
      if (r.italic) h = `<em>${h}</em>`;
      if (r.bold) h = `<strong>${h}</strong>`;
      return h;
    })
    .join("");

const page = (lang: string, title: string, body: string) => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="${esc(lang)}" lang="${esc(lang)}">
<head><meta charset="UTF-8"/><title>${esc(title)}</title><link rel="stylesheet" type="text/css" href="style.css"/></head>
<body>
${body}
</body>
</html>
`;

const CSS = `body { font-family: serif; line-height: 1.5; margin: 0 5%; }
h1 { text-align: center; margin: 3em 0 1.5em; font-size: 1.6em; line-height: 1.2; }
h2 { margin: 1.6em 0 .6em; font-size: 1.25em; }
h3 { margin: 1.4em 0 .5em; font-size: 1.1em; }
p { margin: 0; text-indent: 1.4em; text-align: justify; }
h1 + p, h2 + p, h3 + p, hr + p, figure + p { text-indent: 0; }
p.center { text-align: center; text-indent: 0; }
hr.scene { border: 0; margin: 1em 0; text-align: center; }
hr.scene::after { content: "* * *"; }
figure { margin: 1em 0; text-align: center; }
figure img { max-width: 100%; max-height: 90vh; }
ul.items, ol.items { margin: .5em 0 .5em 1.2em; padding: 0; }
.titlepage { text-align: center; margin-top: 20%; }
.titlepage h1 { margin: 0 0 .4em; font-size: 2em; }
.titlepage .author { margin-top: 2em; font-size: 1.2em; }
.imprint { margin-top: 4em; font-size: .8em; letter-spacing: .1em; }
`;

export async function buildEpub(input: EpubInput): Promise<Uint8Array> {
  const zip = new JSZip();
  // The mimetype entry must come first and be stored uncompressed.
  zip.file("mimetype", "application/epub+zip", { compression: "STORE" });
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
`,
  );
  const lang = input.lang;
  const manifest: string[] = [];
  const spine: string[] = [];
  const toc: { file: string; title: string }[] = [];
  const add = (id: string, href: string, type: string, props?: string) =>
    manifest.push(`<item id="${id}" href="${href}" media-type="${type}"${props ? ` properties="${props}"` : ""}/>`);

  zip.file("OEBPS/style.css", CSS);
  add("css", "style.css", "text/css");

  if (input.coverJpeg) {
    zip.file("OEBPS/images/cover.jpg", input.coverJpeg);
    add("cover-image", "images/cover.jpg", "image/jpeg", "cover-image");
    zip.file("OEBPS/cover.xhtml", page(lang, input.title, `<div style="text-align:center"><img src="images/cover.jpg" alt="${esc(input.title)}" style="max-width:100%;max-height:100vh"/></div>`));
    add("cover", "cover.xhtml", "application/xhtml+xml");
    spine.push(`<itemref idref="cover" linear="yes"/>`);
  }

  zip.file(
    "OEBPS/title.xhtml",
    page(
      lang,
      input.title,
      `<section class="titlepage" epub:type="titlepage"><h1>${esc(input.title)}</h1>${input.subtitle ? `<p class="center">${esc(input.subtitle)}</p>` : ""}<p class="center author">${esc(input.author)}</p><p class="center imprint">VIVLIOTHIKI BOOKS</p></section>`,
    ),
  );
  add("title", "title.xhtml", "application/xhtml+xml");
  spine.push(`<itemref idref="title"/>`);

  let imageN = 0;
  input.manuscript.chapters.forEach((ch, i) => {
    const file = `chapter-${String(i + 1).padStart(3, "0")}.xhtml`;
    const title = plain(ch.title) || (i === 0 ? input.title : `${i + 1}`);
    const body: string[] = [];
    if (ch.title.length) body.push(`<h1>${runsHtml(ch.title)}</h1>`);
    let items: string[] = [];
    let ordered = false;
    const endList = () => {
      const tag = ordered ? "ol" : "ul";
      if (items.length) body.push(`<${tag} class="items">${items.join("")}</${tag}>`);
      items = [];
    };
    for (const b of ch.blocks as Block[]) {
      if (b.type !== "item") endList();
      if (b.type === "paragraph") body.push(`<p${b.align === "center" ? ' class="center"' : ""}>${runsHtml(b.runs)}</p>`);
      else if (b.type === "heading") body.push(`<h${b.level}>${runsHtml(b.runs)}</h${b.level}>`);
      else if (b.type === "item") {
        if (!items.length) ordered = b.marker !== "•";
        items.push(`<li>${runsHtml(b.runs)}</li>`);
      }
      else if (b.type === "break") body.push(`<hr class="scene"/>`);
      else if (b.type === "image") {
        const data = dataUri(b.src);
        const ext = data && (/png/.test(data.mime) ? "png" : /jpe?g/.test(data.mime) ? "jpg" : /gif/.test(data.mime) ? "gif" : null);
        if (!data || !ext) continue;
        const name = `images/img-${++imageN}.${ext}`;
        zip.file(`OEBPS/${name}`, data.bytes);
        add(`img${imageN}`, name, data.mime === "image/jpg" ? "image/jpeg" : data.mime);
        body.push(`<figure><img src="${name}" alt="${esc(b.alt)}"/></figure>`);
      }
    }
    endList();
    zip.file(`OEBPS/${file}`, page(lang, title, `<section epub:type="chapter">\n${body.join("\n")}\n</section>`));
    add(`c${i + 1}`, file, "application/xhtml+xml");
    spine.push(`<itemref idref="c${i + 1}"/>`);
    toc.push({ file, title });
  });

  zip.file(
    "OEBPS/nav.xhtml",
    page(lang, input.title, `<nav epub:type="toc" id="toc"><h1>${lang === "el" ? "Περιεχόμενα" : "Contents"}</h1><ol>${toc.map((c) => `<li><a href="${c.file}">${esc(c.title)}</a></li>`).join("")}</ol></nav>`),
  );
  add("nav", "nav.xhtml", "application/xhtml+xml", "nav");
  zip.file(
    "OEBPS/toc.ncx",
    `<?xml version="1.0" encoding="UTF-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1"><head><meta name="dtb:uid" content="${esc(input.isbn ?? input.identifier)}"/></head>
<docTitle><text>${esc(input.title)}</text></docTitle><navMap>${toc
      .map((c, i) => `<navPoint id="n${i + 1}" playOrder="${i + 1}"><navLabel><text>${esc(c.title)}</text></navLabel><content src="${c.file}"/></navPoint>`)
      .join("")}</navMap></ncx>
`,
  );
  add("ncx", "toc.ncx", "application/x-dtbncx+xml");

  const id = input.isbn ? `urn:isbn:${input.isbn.replace(/[\s-]/g, "")}` : `urn:uuid:${input.identifier}`;
  const modified = (input.modified ?? new Date()).toISOString().replace(/\.\d+Z$/, "Z");
  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="${esc(lang)}">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:identifier id="bookid">${esc(id)}</dc:identifier>
    <dc:title>${esc(input.title)}</dc:title>
    <dc:creator>${esc(input.author)}</dc:creator>
    <dc:language>${esc(lang)}</dc:language>
    <dc:publisher>Vivliothiki Books</dc:publisher>
    <meta property="dcterms:modified">${modified}</meta>${input.coverJpeg ? '\n    <meta name="cover" content="cover-image"/>' : ""}
  </metadata>
  <manifest>
    ${manifest.join("\n    ")}
  </manifest>
  <spine toc="ncx">
    ${spine.join("\n    ")}
  </spine>
</package>
`,
  );
  return zip.generateAsync({ type: "uint8array", mimeType: "application/epub+zip", compression: "DEFLATE" });
}
