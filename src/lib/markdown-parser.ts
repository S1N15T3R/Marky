import { Marked } from "marked";
import markedKatex from "marked-katex-extension";
import { mangle } from "marked-mangle";
import DOMPurify from "dompurify";
import hljs from "highlight.js";
import type { TocItem } from "@/types";

// Configure the Marked instance once.
const marked = new Marked(
  mangle(),
  markedKatex({
    throwOnError: false,
    // KaTeX CSS is imported globally.
  }),
  {
    gfm: true,
    breaks: false,
  }
);

// Custom highlight function used by marked's renderer for code blocks.
const escapeForAttr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Build a slug id identical to the scheme used by extractToc().
function slugify(text: string, used: Map<string, number>): string {
  let id = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  const count = used.get(id) || 0;
  used.set(id, count + 1);
  if (count > 0) id = `${id}-${count}`;
  return id;
}

const slugState = new Map<string, number>();

marked.use({
  renderer: {
    // @ts-expect-error - marked v14 renderer signature
    code(code: string, infostring: string | undefined, escaped: boolean) {
      const lang = (infostring || "").trim().split(/\s+/)[0];
      let highlighted: string;
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(code, { language: lang }).value;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
      const cls = lang ? ` class="hljs language-${escapeForAttr(lang)}"` : ` class="hljs"`;
      return `<pre><code${cls}>${highlighted}</code></pre>\n`;
    },
    // @ts-expect-error - marked v14 renderer signature
    heading(text: string, level: number) {
      const plain = text.replace(/<[^>]+>/g, "");
      const id = slugify(plain, slugState);
      return `<h${level} id="${escapeForAttr(id)}">${text}</h${level}>\n`;
    },
  },
});

// KaTeX needs math spans to NOT be escaped; DOMPurify must allow them.
const SANITIZE_CONFIG = {
  ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "annotation", "mfrac", "sqrt", "msqrt"],
  ADD_ATTR: ["encoding", "xmlns", "annotation", "style", "class", "aria-hidden"],
  FORBID_TAGS: ["style", "script", "iframe", "form", "input", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick"],
};

let tocSource = "";

export function parseMarkdown(src: string): string {
  tocSource = src;
  let html = marked.parse(src, { async: false }) as string;
  html = DOMPurify.sanitize(html, SANITIZE_CONFIG);
  return html;
}

// Extract a table of contents (headings) from the raw markdown.
export function extractToc(src: string): TocItem[] {
  const lines = src.split("\n");
  const items: TocItem[] = [];
  let inFence = false;
  let slugCount = new Map<string, number>();

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```") || line.trim().startsWith("~~~")) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (!m) continue;
    const level = m[1].length;
    // Normalize to plain text (mirrors the renderer's HTML-tag strip) so the
    // generated slug matches the id injected into the rendered <hN> element.
    const text = m[2]
      .replace(/#+\s*$/, "")
      .replace(/`([^`]+)`/g, "$1") // inline code
      .replace(/\*\*([^*]+)\*\*/g, "$1") // bold
      .replace(/\*([^*]+)\*/g, "$1") // italic
      .replace(/_([^_]+)_/g, "$1")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
      .trim();
    let id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    const count = slugCount.get(id) || 0;
    slugCount.set(id, count + 1);
    if (count > 0) id = `${id}-${count}`;
    items.push({ id, text, level });
  }
  return items;
}

// Build the HTML for a task-list enabled preview copy-as-HTML export.
export function renderForExport(src: string): string {
  return parseMarkdown(src);
}
