import { useFileStore } from "@/stores/fileStore";
import { countWords } from "@/lib/utils";

export default function StatusBar() {
  const content = useFileStore((s) => s.content);
  const name = useFileStore((s) => s.name);
  const path = useFileStore((s) => s.path);
  const dirty = useFileStore((s) => s.dirty);

  const words = countWords(content);
  const lines = content ? content.split("\n").length : 0;
  const bytes = new Blob([content]).size;

  return (
    <div className="flex h-7 items-center gap-4 border-t border-border bg-surface px-3 font-mono text-[11px] text-text-muted">
      <span className="text-accent">{">"}</span>
      <span className="text-text">{name}</span>
      {dirty && <span className="text-yellow-400">[modified]</span>}
      <span>{words.toLocaleString()} words</span>
      <span>{lines} lines</span>
      <span>{bytes} B</span>
      <span className="ml-auto">{path ? "UTF-8 · Markdown" : "untitled · Markdown"}</span>
    </div>
  );
}
