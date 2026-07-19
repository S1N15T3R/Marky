import { useEffect, useMemo, useRef, useState } from "react";
import { useFileStore } from "@/stores/fileStore";
import { useThemeStore } from "@/stores/themeStore";
import { useAiStore } from "@/stores/aiStore";
import { THEMES } from "@/lib/themes";

interface Command {
  id: string;
  title: string;
  group: string;
  run: () => void;
  keywords?: string;
}

export default function CommandPalette({
  open,
  onClose,
  actions,
}: {
  open: boolean;
  onClose: () => void;
  actions: Record<string, () => void>;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const setViewMode = useFileStore((s) => s.setViewMode);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const openPanel = useAiStore((s) => s.setPanelOpen);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands: Command[] = useMemo(() => {
    const list: Command[] = [
      { id: "open", title: "Open File…", group: "File", run: actions.openFile, keywords: "open load" },
      { id: "openfolder", title: "Open Folder…", group: "File", run: actions.openFolder, keywords: "folder directory" },
      { id: "new", title: "New File", group: "File", run: actions.newFile, keywords: "new create" },
      { id: "save", title: "Save", group: "File", run: actions.save, keywords: "save write" },
      { id: "saveas", title: "Save As…", group: "File", run: actions.saveAs, keywords: "saveas export" },
      { id: "ed", title: "View: Editor Only", group: "View", run: () => setViewMode("editor"), keywords: "editor ctrl1" },
      { id: "split", title: "View: Split", group: "View", run: () => setViewMode("split"), keywords: "split ctrl2" },
      { id: "pv", title: "View: Preview Only", group: "View", run: () => setViewMode("preview"), keywords: "preview ctrl3" },
      { id: "sidebar", title: "Toggle File Sidebar", group: "View", run: actions.toggleSidebar, keywords: "sidebar files" },
      { id: "aipanel", title: "Toggle AI Chat Panel", group: "View", run: () => openPanel(true), keywords: "ai chat" },
      { id: "theme", title: "Cycle Theme", group: "Theme", run: cycleTheme, keywords: "theme dark light" },
    ] as Command[];

    // Add each theme as its own command.
    for (const t of THEMES) {
      list.push({
        id: "theme-" + t.id,
        title: "Theme: " + t.name,
        group: "Theme",
        run: () => setTheme(t.id),
        keywords: t.id,
      });
    }
    return list;
  }, [actions]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return commands;
    return commands.filter(
      (c) => c.title.toLowerCase().includes(q) || c.keywords?.toLowerCase().includes(q)
    );
  }, [query, commands]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 pt-[12vh]"
      onMouseDown={onClose}
    >
      <div
        className="glass w-full max-w-lg overflow-hidden rounded-float border border-border shadow-glow"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="> Type a command…"
          className="w-full border-b border-border bg-transparent px-4 py-3 text-sm text-text outline-none placeholder:text-text-muted"
        />
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-3 text-xs text-text-muted">No commands found.</div>
          )}
          {filtered.map((c) => (
            <button
              key={c.id}
              onClick={() => {
                c.run();
                onClose();
              }}
              className="flex w-full items-center justify-between px-4 py-2 text-left text-xs text-text hover:bg-surface-2"
            >
              <span>{c.title}</span>
              <span className="text-text-muted">{c.group}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
