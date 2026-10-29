// A book's text, read from a Word file (via mammoth's HTML) into blocks that both the print
// interior and the EPUB are made from.

export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
}

export type Block =
  | { type: "heading"; level: 1 | 2 | 3; runs: Run[] }
  | { type: "paragraph"; runs: Run[]; align?: "center" }
  | { type: "item"; runs: Run[]; marker: string } // a list item; marker is "•" or "3."
  | { type: "image"; src: string; alt: string } // src is a data: URI
  | { type: "break" }; // a scene break ("***")

export interface Chapter {
  title: Run[]; // empty for text before the first heading
  blocks: Block[];
}

export interface Manuscript {
  chapters: Chapter[];
  words: number;
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
const decode = (s: string) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : Number(e.slice(1))) : (ENTITIES[e.toLowerCase()] ?? m),
  );
const attr = (attrs: string, name: string) => {
  const m = new RegExp(`${name}="([^"]*)"`).exec(attrs);
  return m ? decode(m[1]) : "";
};

// Joins neighbouring runs with the same style and tidies the whitespace Word leaves behind.
function tidy(runs: Run[]): Run[] {
  const out: Run[] = [];
  for (const r of runs) {
    const text = r.text.replace(/[\t\r\n ]+/g, " ");
    if (!text) continue;
    const last = out[out.length - 1];
    if (last && !!last.bold === !!r.bold && !!last.italic === !!r.italic) last.text += text;
    else out.push({ text, ...(r.bold && { bold: true }), ...(r.italic && { italic: true }) });
  }
  if (out.length) {
    out[0].text = out[0].text.replace(/^ +/, "");
    out[out.length - 1].text = out[out.length - 1].text.replace(/ +$/, "");
  }
  return out.filter((r) => r.text);
}

export const plain = (runs: Run[]) => runs.map((r) => r.text).join("");
const SCENE_BREAK = /^\s*([*#~⁂•·]\s*){1,5}$/;

// Reads mammoth's HTML. It is well formed and uses few tags, so a small tokenizer is enough.
export function parseManuscriptHtml(html: string): Manuscript {
  const blocks: Block[] = [];
  let runs: Run[] = [];
  let bold = 0, italic = 0, skip = 0;
  let current: { kind: "p" | "h"; level: 1 | 2 | 3; align?: "center" } | null = null;
  const lists: { ordered: boolean; n: number }[] = [];
  let itemMarker: string | null = null;

  const flush = () => {
    const r = tidy(runs);
    runs = [];
    if (!current) return;
    if (current.kind === "h") {
      if (r.length) blocks.push({ type: "heading", level: current.level, runs: r });
    } else if (itemMarker) {
      if (r.length) blocks.push({ type: "item", runs: r, marker: itemMarker });
    } else if (r.length && SCENE_BREAK.test(plain(r))) blocks.push({ type: "break" });
    else if (r.length) blocks.push({ type: "paragraph", runs: r, ...(current.align && { align: current.align }) });
  };

  for (const m of html.matchAll(/<(\/?)([a-z][a-z0-9]*)([^>]*?)\/?>|([^<]+)/gi)) {
    const [, closing, rawTag, attrs, text] = m;
    if (text !== undefined) {
      if (!skip) runs.push({ text: decode(text), bold: bold > 0, italic: italic > 0 });
      continue;
    }
    const tag = rawTag.toLowerCase();
    if (closing) {
      if (tag === "strong" || tag === "b") bold--;
      else if (tag === "em" || tag === "i") italic--;
      else if (tag === "sup" || tag === "sub") skip--;
      else if (/^(p|h[1-6]|li|td|th)$/.test(tag)) {
        flush();
        current = null;
        if (tag === "li") itemMarker = null;
      } else if (tag === "ul" || tag === "ol") lists.pop();
      continue;
    }
    if (tag === "strong" || tag === "b") bold++;
    else if (tag === "em" || tag === "i") italic++;
    else if (tag === "sup" || tag === "sub") skip++; // footnote marks; the notes themselves follow as a list
    else if (tag === "br") runs.push({ text: " " });
    else if (/^h[1-6]$/.test(tag)) {
      flush();
      current = { kind: "h", level: Math.min(3, Number(tag[1])) as 1 | 2 | 3 };
    } else if (tag === "p" || tag === "td" || tag === "th") {
      flush();
      current = { kind: "p", level: 1, ...(/text-align:\s*center/.test(attrs) && { align: "center" as const }) };
    } else if (tag === "ul" || tag === "ol") lists.push({ ordered: tag === "ol", n: 0 });
    else if (tag === "li") {
      flush();
      const list = lists[lists.length - 1];
      itemMarker = list?.ordered ? `${++list.n}.` : "•";
      current = { kind: "p", level: 1 };
    } else if (tag === "img") {
      const src = attr(attrs, "src");
      if (src.startsWith("data:image/")) {
        flush();
        blocks.push({ type: "image", src, alt: attr(attrs, "alt") });
      }
    }
  }
  flush();
  return toChapters(blocks);
}

// Chapters start at the top heading level the author used (Heading 1, or Heading 2 if there's none).
export function toChapters(blocks: Block[]): Manuscript {
  const levels = blocks.filter((b) => b.type === "heading").map((b) => (b as { level: number }).level);
  const top = levels.length ? Math.min(...levels) : 0;
  const chapters: Chapter[] = [];
  let cur: Chapter = { title: [], blocks: [] };
  for (const b of blocks) {
    if (b.type === "heading" && b.level === top) {
      if (cur.title.length || cur.blocks.length) chapters.push(cur);
      cur = { title: b.runs, blocks: [] };
    } else cur.blocks.push(b.type === "heading" ? { ...b, level: Math.min(3, b.level - top + 2) as 2 | 3 } : b);
  }
  if (cur.title.length || cur.blocks.length) chapters.push(cur);
  const words = blocks.reduce((n, b) => n + ("runs" in b ? plain(b.runs).split(/\s+/).filter(Boolean).length : 0), 0);
  return { chapters, words };
}

export function dataUri(src: string): { mime: string; bytes: Uint8Array } | null {
  const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(src);
  if (!m) return null;
  const bin = atob(m[2]);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return { mime: m[1], bytes };
}
