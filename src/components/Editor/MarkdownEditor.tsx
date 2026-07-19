import { useEffect, useRef } from "react";
import Editor, { type OnMount, loader } from "@monaco-editor/react";
import * as monaco from "monaco-editor";
import editorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import { useFileStore } from "@/stores/fileStore";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore, themeMeta } from "@/stores/themeStore";

// Use the locally-bundled monaco-editor (not the CDN) so the editor works
// fully offline and inside the Tauri bundle. Vite serves the worker locally.
self.MonacoEnvironment = {
  getWorker() {
    return new editorWorker();
  },
};
loader.config({ monaco });

// Define Marky Monaco themes (must match CSS palettes).
function defineMonacoThemes(monaco: any) {
  monaco.editor.defineTheme("marky-midnight", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "c9d1d9" },
      { token: "comment", foreground: "8b949e", fontStyle: "italic" },
      { token: "keyword", foreground: "ff7b72" },
      { token: "string", foreground: "a5d6ff" },
      { token: "number", foreground: "79c0ff" },
      { token: "heading", foreground: "00ff41", fontStyle: "bold" },
      { token: "emphasis", foreground: "d2a8ff", fontStyle: "italic" },
      { token: "strong", foreground: "d2a8ff", fontStyle: "bold" },
      { token: "link", foreground: "58a6ff", fontStyle: "underline" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#484f58",
      "editorCursor.foreground": "#00ff41",
      "editor.selectionBackground": "#1f6feb44",
      "editor.lineHighlightBackground": "#161b2255",
      "editorGutter.background": "#0d1117",
    },
  });
  monaco.editor.defineTheme("marky-cyberpunk", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "", foreground: "e6e6ff" },
      { token: "comment", foreground: "8a8ab0", fontStyle: "italic" },
      { token: "keyword", foreground: "ff00ff" },
      { token: "string", foreground: "00ffff" },
      { token: "heading", foreground: "ff00ff", fontStyle: "bold" },
    ],
    colors: {
      "editor.background": "#0a0a0f",
      "editor.foreground": "#e6e6ff",
      "editorCursor.foreground": "#00ffff",
      "editorLineNumber.foreground": "#4a4a6a",
      "editor.selectionBackground": "#ff00ff33",
    },
  });
  monaco.editor.defineTheme("marky-solarized", {
    base: "vs-dark",
    inherit: true,
    rules: [{ token: "", foreground: "93a1a1" }, { token: "heading", foreground: "2aa198", fontStyle: "bold" }],
    colors: {
      "editor.background": "#002b36",
      "editor.foreground": "#93a1a1",
      "editorCursor.foreground": "#2aa198",
      "editorLineNumber.foreground": "#586e75",
    },
  });
  monaco.editor.defineTheme("marky-obsidian", {
    base: "vs-dark",
    inherit: true,
    rules: [{ token: "", foreground: "e5e5ea" }, { token: "heading", foreground: "a78bfa", fontStyle: "bold" }],
    colors: {
      "editor.background": "#1a1a1a",
      "editor.foreground": "#e5e5ea",
      "editorCursor.foreground": "#7c3aed",
      "editorLineNumber.foreground": "#6a6a75",
    },
  });
  monaco.editor.defineTheme("marky-paper", {
    base: "vs",
    inherit: true,
    rules: [{ token: "", foreground: "1a1a1a" }, { token: "heading", foreground: "0a7d4d", fontStyle: "bold" }],
    colors: {
      "editor.background": "#fafafa",
      "editor.foreground": "#1a1a1a",
      "editorCursor.foreground": "#0a7d4d",
      "editorLineNumber.foreground": "#9aa0a6",
    },
  });
}

export default function MarkdownEditor() {
  const content = useFileStore((s) => s.content);
  const setContent = useFileStore((s) => s.setContent);
  const path = useFileStore((s) => s.path);
  const settings = useSettingsStore((s) => s.settings);
  const theme = useThemeStore((s) => s.theme);

  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const onChangeRef = useRef(setContent);
  onChangeRef.current = setContent;

  const onMount: OnMount = (ed, monaco) => {
    editorRef.current = ed;
    monacoRef.current = monaco;
    defineMonacoThemes(monaco);
    applyOptions();
  };

  function applyOptions() {
    const ed = editorRef.current;
    if (!ed) return;
    ed.updateOptions({
      fontFamily: "var(--marky-font-mono), ui-monospace, monospace",
      fontSize: settings.editorFontSize,
      wordWrap: settings.wordWrap ? "on" : "off",
      lineNumbers: settings.lineNumbers ? "on" : "off",
      minimap: { enabled: settings.minimap },
      theme: themeMeta(theme).monaco,
      smoothScrolling: true,
      cursorBlinking: "smooth",
      padding: { top: 12 },
      scrollBeyondLastLine: false,
    });
    // editorZoom is a percentage; Monaco zoom is a multiplier.
    ed.updateOptions({ fontSize: Math.round(settings.editorFontSize * (settings.editorZoom / 100)) });
  }

  useEffect(() => {
    applyOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.editorFontSize, settings.wordWrap, settings.lineNumbers, settings.minimap, theme]);

  // Expose the editor instance globally so sync-scroll + shortcuts can use it.
  useEffect(() => {
    (window as any).__markyEditor = editorRef.current;
  });

  return (
    <Editor
      height="100%"
      defaultLanguage="markdown"
      theme={themeMeta(theme).monaco}
      value={content}
      onChange={(v) => onChangeRef.current(v ?? "")}
      onMount={onMount}
      options={{
        fontFamily: "var(--marky-font-mono), ui-monospace, monospace",
        fontSize: settings.editorFontSize,
        wordWrap: settings.wordWrap ? "on" : "off",
        lineNumbers: settings.lineNumbers ? "on" : "off",
        minimap: { enabled: settings.minimap },
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        renderWhitespace: "none",
        tabSize: 2,
        automaticLayout: true,
      }}
    />
  );
}
