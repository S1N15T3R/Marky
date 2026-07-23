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

// Build a slug id identical to the scheme used by extractToc(). The `marky-`
// prefix avoids DOM-clobbering names (title, head, body, …) that DOMPurify
// silently strips, which would otherwise break TOC anchor jumps.
const SLUG_PREFIX = "marky-";
function slugify(text: string, used: Map<string, number>): string {
  let id = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
  const count = used.get(id) || 0;
  used.set(id, count + 1);
  if (count > 0) id = `${id}-${count}`;
  return SLUG_PREFIX + id;
}

const slugState = new Map<string, number>();

// Marked v12+ passes a token object to each renderer method (not positional
// args). `this.parser` is available for inline rendering. The previous
// positional-arg signature crashed on the first code block / heading, taking
// down the whole preview.
marked.use({
  renderer: {
    // Keep task-list checkboxes interactive (no `disabled` attr) so the
    // preview's click-to-toggle wiring can write state back into the source.
    checkbox(token: any) {
      return `<input type="checkbox" ${token.checked ? "checked" : ""} />`;
    },
    code(token: any) {
      const code = token.text as string;
      const lang = (token.lang || "").trim().split(/\s+/)[0];
      let highlighted: string;
      if (lang && hljs.getLanguage(lang)) {
        highlighted = hljs.highlight(code, { language: lang }).value;
      } else {
        highlighted = hljs.highlightAuto(code).value;
      }
      const cls = lang ? ` class="hljs language-${escapeForAttr(lang)}"` : ` class="hljs"`;
      return `<pre><code${cls}>${highlighted}</code></pre>\n`;
    },
    heading(token: any) {
      const text = this.parser.parseInline(token.tokens);
      const plain = token.text as string;
      const id = slugify(plain, slugState);
      return `<h${token.depth} id="${escapeForAttr(id)}">${text}</h${token.depth}>\n`;
    },
  },
});

// KaTeX needs math spans to NOT be escaped; DOMPurify must allow them.
// Task-list checkboxes (<input type="checkbox">) are allowed (and kept
// interactive — the renderers never emit a `disabled` attr) so the preview's
// click-to-toggle feature works.
const SANITIZE_CONFIG = {
  ADD_TAGS: ["math", "semantics", "mrow", "mi", "mo", "mn", "msup", "msub", "annotation", "mfrac", "sqrt", "msqrt", "input"],
  ADD_ATTR: ["encoding", "xmlns", "annotation", "style", "class", "aria-hidden", "type", "checked"],
  FORBID_TAGS: ["style", "script", "iframe", "form", "button"],
  FORBID_ATTR: ["onerror", "onload", "onclick"],
};

let tocSource = "";

export function parseMarkdown(src: string): string {
  tocSource = src;
  // Reset the slug counter before each parse so heading ids are stable
  // across re-renders and match the ids produced by extractToc().
  slugState.clear();
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
    // Must match the prefix used in parseMarkdown()'s slugify().
    id = SLUG_PREFIX + id;
    items.push({ id, text, level });
  }
  return items;
}

// Build the HTML for a task-list enabled preview copy-as-HTML export.
export function renderForExport(src: string): string {
  return parseMarkdown(src);
}
