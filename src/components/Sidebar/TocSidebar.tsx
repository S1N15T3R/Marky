import type { TocItem } from "@/types";

export default function TocSidebar({ toc, onJump }: { toc: TocItem[]; onJump: (item: TocItem) => void }) {
  if (toc.length === 0) {
    return (
      <div className="p-3 text-xs text-text-muted">
        No headings yet. Add <code className="text-accent"># Heading</code> to your document.
      </div>
    );
  }
  return (
    <div className="p-2">
      <div className="mb-2 px-1 text-[11px] uppercase tracking-wider text-text-muted">Contents</div>
      <ul className="space-y-0.5">
        {toc.map((item) => (
          <li key={item.id}>
            <button
              onClick={() => onJump(item)}
              className="block w-full truncate rounded px-2 py-0.5 text-left text-xs text-text-muted hover:bg-surface-2 hover:text-text"
              style={{ paddingLeft: (item.level - 1) * 12 + 8 }}
              title={item.text}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
