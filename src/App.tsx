import { useCallback, useEffect, useRef, useState } from "react";
import TitleBar from "@/components/TitleBar/TitleBar";
import StatusBar from "@/components/StatusBar/StatusBar";
import FileSidebar from "@/components/Sidebar/FileSidebar";
import TocSidebar from "@/components/Sidebar/TocSidebar";
import MarkdownEditor from "@/components/Editor/MarkdownEditor";
import Preview from "@/components/Preview/Preview";
import AiPanel from "@/components/AiPanel/AiPanel";
import CommandPalette from "@/components/CommandPalette/CommandPalette";
import SettingsModal from "@/components/Settings/SettingsModal";
import { QuickActionsToolbar } from "@/components/AiPanel/QuickActionsToolbar";
import { InlineAiMenu, useSelectionTracker } from "@/components/AiPanel/InlineAiMenu";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { useAiStore } from "@/stores/aiStore";
import { usePersistence } from "@/hooks/usePersistence";
import { useAi } from "@/hooks/useAi";
import {
  openFilePicker,
  pickFolder,
  readTextFile,
  writeTextFile,
  readDir,
  dbAddRecent,
  saveAsPicker,
  copyText,
  exportFile,
  openExternal,
  runningInTauri,
} from "@/lib/platform";
import { parseMarkdown } from "@/lib/markdown-parser";
import { basename, countWords, uid } from "@/lib/utils";
import type { TocItem } from "@/types";

export default function App() {
  usePersistence();
  useSelectionTracker();
  const { runStream } = useAi();

  const viewMode = useFileStore((s) => s.viewMode);
  const setViewMode = useFileStore((s) => s.setViewMode);
  const content = useFileStore((s) => s.content);
  const setContent = useFileStore((s) => s.setContent);
  const setFile = useFileStore((s) => s.setFile);
  const setUntitled = useFileStore((s) => s.setUntitled);
  const setSaved = useFileStore((s) => s.setSaved);
  const name = useFileStore((s) => s.name);
  const path = useFileStore((s) => s.path);
  const dirty = useFileStore((s) => s.dirty);
  const setFolder = useFileStore((s) => s.setFolder);
  const recent = useFileStore((s) => s.recent);
  const setRecent = useFileStore((s) => s.setRecent);

  const settings = useSettingsStore((s) => s.settings);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [tocOpen, setTocOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toc, setToc] = useState<TocItem[]>([]);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  const editorScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const autoSaveTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Keep the AI panel visibility in sync with the AI store (toggled by the
  // command palette and keyboard shortcuts via useAiStore.setPanelOpen).
  useEffect(() => {
    const unsub = useAiStore.subscribe((s) => setAiPanelOpen(s.panelOpen));
    setAiPanelOpen(useAiStore.getState().panelOpen);
    return unsub;
  }, []);

  // Drag-to-resize the AI chat split. Persists to settings (and thus the store).
  const startResizeAi = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = useSettingsStore.getState().settings.aiPanelWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(280, Math.min(720, startW + (startX - ev.clientX)));
      useSettingsStore.getState().setSettings({ aiPanelWidth: next });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // Drag-to-resize the Files/explorer sidebar. Persists to settings.
  const startResizeSidebar = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = useSettingsStore.getState().settings.fileSidebarWidth;
    const onMove = (ev: MouseEvent) => {
      const next = Math.max(180, Math.min(520, startW + (ev.clientX - startX)));
      useSettingsStore.getState().setSettings({ fileSidebarWidth: next });
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
    };
    document.body.style.cursor = "col-resize";
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  // ---- File operations ----
  const openFile = useCallback(async () => {
    const r = await openFilePicker();
    if (!r) return;
    setFile(r.path, basename(r.path), r.content);
    await dbAddRecent(r.path, basename(r.path));
    setRecent([{ path: r.path, name: basename(r.path), lastOpened: Date.now() }, ...recent.filter((x) => x.path !== r.path).slice(0, 29)]);
  }, [recent]);

  const openFolder = useCallback(async () => {
    const dir = await pickFolder();
    if (!dir) return;
    const tree = await readDir(dir, 4);
    setFolder(dir, tree);
    setSidebarOpen(true);
  }, []);

  const newFile = useCallback(() => {
    setUntitled(`untitled-${uid().slice(0, 4)}.md`, "");
  }, []);

  const save = useCallback(async () => {
    if (!path) {
      const sp = await saveAsPicker(name);
      if (!sp) return;
      await writeTextFile(sp, content);
      setFile(sp, basename(sp), content);
      await dbAddRecent(sp, basename(sp));
    } else {
      await writeTextFile(path, content);
      setSaved();
    }
  }, [path, content, name]);

  const saveAs = useCallback(async () => {
    const sp = await saveAsPicker(name);
    if (!sp) return;
    await writeTextFile(sp, content);
    setFile(sp, basename(sp), content);
    await dbAddRecent(sp, basename(sp));
  }, [content, name]);

  // ---- Auto-save ----
  useEffect(() => {
    if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    if (settings.autoSave && path) {
      autoSaveTimer.current = setInterval(() => {
        if (useFileStore.getState().dirty) {
          writeTextFile(path, useFileStore.getState().content).then(() => setSaved());
        }
      }, settings.autoSaveInterval * 1000);
    }
    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current);
    };
  }, [settings.autoSave, settings.autoSaveInterval, path]);

  // ---- Export ----
  const buildHtmlDoc = (body: string) => {
    return `<!doctype html><html><head><meta charset="utf-8"><title>${name}</title>
<style>body{font-family:ui-monospace,monospace;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6;color:#222;background:#fff}pre{background:#f6f8fa;padding:12px;border-radius:6px;overflow:auto}code{font-family:ui-monospace,monospace}table{border-collapse:collapse}td,th{border:1px solid #ddd;padding:6px}blockquote{border-left:3px solid #ccc;margin:0;padding-left:12px;color:#666}</style>
</head><body>${body}</body></html>`;
  };

  const exportHtml = async () => {
    const html = buildHtmlDoc(parseMarkdown(content));
    if (runningInTauri) {
      const sp = await saveAsPicker(name.replace(/\.(md|markdown)$/i, "") + ".html");
      if (sp) await exportFile(sp, html);
    } else {
      exportFile(name.replace(/\.(md|markdown)$/i, "") + ".html", html);
    }
  };

  const copyPreviewHtml = async () => {
    await copyText(parseMarkdown(content));
  };

  const exportPdf = async () => {
    const html = buildHtmlDoc(parseMarkdown(content));
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 400);
    }
  };

  // ---- Sync scroll ----
  const syncScroll = useCallback(
    (from: "editor" | "preview", ratio: number) => {
      if (!settings.syncScroll) return;
      const target = from === "editor" ? previewScrollRef.current : editorScrollRef.current;
      if (!target) return;
      const max = target.scrollHeight - target.clientHeight;
      target.scrollTop = ratio * max;
    },
    [settings.syncScroll]
  );

  const onEditorScroll = () => {
    const el = editorScrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    syncScroll("editor", max > 0 ? el.scrollTop / max : 0);
  };
  const onPreviewScroll = () => {
    const el = previewScrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    syncScroll("preview", max > 0 ? el.scrollTop / max : 0);
  };

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const k = e.key.toLowerCase();
      if (k === "o" && !e.shiftKey) { e.preventDefault(); openFile(); }
      else if (k === "o" && e.shiftKey) { e.preventDefault(); openFolder(); }
      else if (k === "s" && !e.shiftKey) { e.preventDefault(); save(); }
      else if (k === "s" && e.shiftKey) { e.preventDefault(); saveAs(); }
      else if (k === "n") { e.preventDefault(); newFile(); }
      else if (k === "1") { e.preventDefault(); setViewMode("editor"); }
      else if (k === "2") { e.preventDefault(); setViewMode("split"); }
      else if (k === "3") { e.preventDefault(); setViewMode("preview"); }
      else if (k === "b") { e.preventDefault(); setSidebarOpen((v) => !v); }
      else if (k === "j") { e.preventDefault(); useAiStore.getState().setPanelOpen(!useAiStore.getState().panelOpen); }
      else if (k === "k") { e.preventDefault(); setPaletteOpen(true); }
      else if (k === "p" && e.shiftKey) { e.preventDefault(); useAiStore.getState().setPanelOpen(true); }
      else if (k === "t" && e.shiftKey) { e.preventDefault(); cycleTheme(); }
      else if (k === "c" && e.shiftKey) { e.preventDefault(); copyPreviewHtml(); }
      else if (k === "e" && !e.shiftKey) { e.preventDefault(); exportHtml(); }
      else if (k === "e" && e.shiftKey) { e.preventDefault(); exportPdf(); }
      else if (e.key === "=") { e.preventDefault(); useSettingsStore.getState().setSettings({ editorZoom: Math.min(200, settings.editorZoom + 10) }); }
      else if (e.key === "-") { e.preventDefault(); useSettingsStore.getState().setSettings({ editorZoom: Math.max(50, settings.editorZoom - 10) }); }
      else if (k === "0") { e.preventDefault(); useSettingsStore.getState().setSettings({ editorZoom: 100 }); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openFile, openFolder, save, saveAs, newFile, setViewMode, cycleTheme, copyPreviewHtml, exportHtml, exportPdf, runStream]);

  // F11 fullscreen, Ctrl+0 reset zoom handled at window level.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F11") {
        e.preventDefault();
        if (runningInTauri) {
          import("@tauri-apps/api/window").then(async (w) => {
            const win = w.getCurrentWindow();
            (await win.isFullscreen()) ? win.setFullscreen(false) : win.setFullscreen(true);
          });
        } else {
          document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const actions = {
    openFile, openFolder, newFile, save, saveAs,
    toggleSidebar: () => setSidebarOpen((v) => !v),
  };

  const jumpToHeading = (item: TocItem) => {
    const el = previewScrollRef.current?.querySelector(`#${CSS.escape(item.id)}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg text-text">
      <TitleBar />
      <Toolbar
        viewMode={viewMode}
        onView={setViewMode}
        onOpen={openFile}
        onOpenFolder={openFolder}
        onNew={newFile}
        onSave={save}
        onSettings={() => setSettingsOpen(true)}
        onExportHtml={exportHtml}
        onExportPdf={exportPdf}
        onCopyHtml={copyPreviewHtml}
        dirty={dirty}
      />

      <div className="flex min-h-0 flex-1">
        {sidebarOpen && (
          <div style={{ width: settings.fileSidebarWidth }} className="flex shrink-0 border-r border-border bg-surface">
            <FileSidebar />
            <div
              onMouseDown={startResizeSidebar}
              className="w-1 cursor-col-resize bg-transparent transition-colors hover:bg-accent/40"
              title="Drag to resize the Files panel"
            />
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <QuickActionsToolbar />
          <div className="flex min-h-0 flex-1">
            {viewMode !== "preview" && (
              <div
                ref={editorScrollRef}
                data-edit-region
                className="min-w-0 flex-1 overflow-hidden"
                onScroll={onEditorScroll}
              >
                <MarkdownEditor />
              </div>
            )}
            {viewMode === "split" && <div className="w-px bg-border" />}
            {viewMode !== "editor" && (
              <div ref={previewScrollRef} data-edit-region className="min-w-0 flex-1 overflow-hidden" onScroll={onPreviewScroll}>
                <Preview onToc={setToc} />
              </div>
            )}
          </div>
        </div>

        {aiPanelOpen && (
          <>
            <div
              onMouseDown={startResizeAi}
              className="w-1 shrink-0 cursor-col-resize bg-border hover:bg-accent"
              title="Drag to resize AI panel"
            />
            <div style={{ width: settings.aiPanelWidth }} className="h-full shrink-0">
              <AiPanel />
            </div>
          </>
        )}

        {tocOpen && (
          <div className="w-56 shrink-0 overflow-y-auto border-l border-border bg-surface">
            <TocSidebar toc={toc} onJump={jumpToHeading} />
          </div>
        )}
      </div>

      <StatusBar />

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} actions={actions} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <InlineAiMenu />

      {/* CRT overlay */}
      <div className={`crt-overlay ${settings.crtEffect ? "active" : ""}`} />

      {/* TOC toggle button (floating) */}
      <button
        onClick={() => setTocOpen((v) => !v)}
        title="Toggle Table of Contents"
        className="fixed bottom-9 right-3 z-40 rounded-full border border-border bg-surface px-3 py-1 text-[11px] text-text-muted hover:border-accent hover:text-accent"
      >
        TOC
      </button>
    </div>
  );
}

function ExportMenu({ onExportHtml, onExportPdf, onCopyHtml }: { onExportHtml: () => void; onExportPdf: () => void; onCopyHtml: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);
  return (
    <span className="relative" ref={ref}>
      <button className="rounded px-2 py-1 text-xs text-text-muted hover:text-text" onClick={() => setOpen((v) => !v)}>
        Export ▾
      </button>
      {open && (
        <div className="absolute left-0 top-7 z-50 w-44 rounded-panel border border-border bg-surface py-1 text-xs">
          <button className="block w-full px-3 py-1 text-left text-text hover:bg-surface-2" onClick={() => { onExportHtml(); setOpen(false); }}>Export HTML</button>
          <button className="block w-full px-3 py-1 text-left text-text hover:bg-surface-2" onClick={() => { onExportPdf(); setOpen(false); }}>Export PDF</button>
          <button className="block w-full px-3 py-1 text-left text-text hover:bg-surface-2" onClick={() => { onCopyHtml(); setOpen(false); }}>Copy as HTML</button>
        </div>
      )}
    </span>
  );
}

function Toolbar({
  viewMode, onView, onOpen, onOpenFolder, onNew, onSave, onSettings, onExportHtml, onExportPdf, onCopyHtml, dirty,
}: {
  viewMode: string; onView: (m: any) => void; onOpen: () => void; onOpenFolder: () => void;
  onNew: () => void; onSave: () => void; onSettings: () => void; onExportHtml: () => void;
  onExportPdf: () => void; onCopyHtml: () => void; dirty: boolean;
}) {
  const btn = (active: boolean) =>
    `rounded px-2 py-1 text-xs ${active ? "bg-accent/20 text-accent" : "text-text-muted hover:text-text"}`;
  return (
    <div className="flex items-center gap-1 border-b border-border bg-surface px-2 py-1">
      <button className="rounded px-2 py-1 text-xs text-text-muted hover:text-text" onClick={onOpen}>File</button>
      <button className="rounded px-2 py-1 text-xs text-text-muted hover:text-text" onClick={onNew}>New</button>
      <button className="rounded px-2 py-1 text-xs text-text-muted hover:text-text" onClick={onOpenFolder}>Open Folder</button>
      <button className="rounded px-2 py-1 text-xs text-text-muted hover:text-text" onClick={onSave}>Save</button>
      <div className="mx-2 h-4 w-px bg-border" />
      <span className="text-[10px] uppercase tracking-wider text-text-muted">View</span>
      <button className={btn(viewMode === "editor")} onClick={() => onView("editor")}>1 Editor</button>
      <button className={btn(viewMode === "split")} onClick={() => onView("split")}>2 Split</button>
      <button className={btn(viewMode === "preview")} onClick={() => onView("preview")}>3 Preview</button>
      <div className="mx-2 h-4 w-px bg-border" />
      <ExportMenu onExportHtml={onExportHtml} onExportPdf={onExportPdf} onCopyHtml={onCopyHtml} />

      <button className="ml-auto rounded px-2 py-1 text-xs text-text-muted hover:text-text" onClick={onSettings}>⚙ Settings</button>
      {dirty && <span className="text-[11px] text-yellow-400">●</span>}
    </div>
  );
}
