import { useEffect, useMemo, useRef } from "react";
import { parseMarkdown, extractToc } from "@/lib/markdown-parser";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import type { TocItem } from "@/types";

const setContent = useFileStore.getState().setContent;

let mermaidReady: Promise<any> | null = null;
function loadMermaid() {
  if (!mermaidReady) {
    mermaidReady = import("mermaid").then((m) => {
      m.default.initialize({ startOnLoad: false, theme: "dark", securityLevel: "loose" });
      return m.default;
    });
  }
  return mermaidReady;
}

export default function Preview({ onToc }: { onToc?: (toc: TocItem[]) => void }) {
  const content = useFileStore((s) => s.content);
  const settings = useSettingsStore((s) => s.settings);
  const theme = useSettingsStore((s) => s.settings.theme);
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const html = useMemo(() => parseMarkdown(content), [content]);
  const toc = useMemo(() => extractToc(content), [content]);

  useEffect(() => {
    onToc?.(toc);
  }, [toc, onToc]);

  // Debounced render + mermaid + interactive checkboxes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const el = ref.current;
      if (!el) return;
      el.innerHTML = html;
      el.style.fontSize = `${settings.previewZoom / 100 * 15}px`;

      // Mermaid
      const mermaidEls = el.querySelectorAll("code.language-mermaid");
      if (mermaidEls.length) {
        try {
          const mermaid = await loadMermaid();
          for (const codeEl of Array.from(mermaidEls)) {
            const pre = codeEl.parentElement!;
            const graph = codeEl.textContent || "";
            try {
              const { svg } = await mermaid.render(`mmd-${Math.random().toString(36).slice(2)}`, graph);
              const div = document.createElement("div");
              div.className = "mermaid-block";
              div.innerHTML = svg;
              pre.replaceWith(div);
            } catch {
              /* leave as code */
            }
          }
        } catch {
          /* ignore */
        }
      }

      // Interactive task checkboxes: write toggled state back into the markdown.
      const checkboxes = Array.from(el.querySelectorAll<HTMLInputElement>('input[type="checkbox"]'));
      if (checkboxes.length) {
        // Map checkbox index -> task line index in the raw source.
        const taskLines: number[] = [];
        content.split("\n").forEach((line, idx) => {
          if (/^\s*[-*+]\s+\[[ xX]\]\s+/.test(line)) taskLines.push(idx);
        });
        checkboxes.forEach((cb, i) => {
          cb.addEventListener("change", () => {
            const lineIdx = taskLines[i];
            if (lineIdx === undefined) return;
            const lines = content.split("\n");
            lines[lineIdx] = lines[lineIdx].replace(
              /(\[)([ xX])(\])/,
              cb.checked ? "[x]" : "[ ]"
            );
            setContent(lines.join("\n"));
          });
        });
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // Re-render on theme change too (mermaid colors).
  }, [html, settings.previewZoom, theme]);

  return (
    <div className="marky-preview h-full overflow-y-auto px-6 py-4 leading-relaxed">
      <div
        ref={ref}
        className="prose-marky max-w-none [&_h1]:border-b [&_h1]:border-border [&_h1]:pb-2 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:text-lg [&_a]:text-accent [&_a]:underline [&_code]:rounded [&_code]:bg-surface-2 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-accent-2 [&_pre]:my-3 [&_pre]:rounded-panel [&_blockquote]:border-l-2 [&_blockquote]:border-accent [&_blockquote]:pl-3 [&_blockquote]:text-text-muted [&_table]:w-full [&_th]:border [&_th]:border-border [&_td]:border [&_td]:border-border [&_th]:bg-surface-2 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1 [&_img]:max-w-full"
      />
    </div>
  );
}
