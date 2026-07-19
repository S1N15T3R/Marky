import { useEffect, useState } from "react";
import { useAiStore } from "@/stores/aiStore";
import { useFileStore } from "@/stores/fileStore";
import { streamToConversation } from "@/lib/ai-engine";

// Tracks the current editor selection (set by the editor's mouseup/keyup).
export function useSelectionTracker() {
  const setSelectedText = useAiStore((s) => s.setSelectedText);
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()?.toString() || "";
      setSelectedText(sel);
    };
    document.addEventListener("selectionchange", handler);
    return () => document.removeEventListener("selectionchange", handler);
  }, []);
}

export function InlineAiMenu() {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const selectedText = useAiStore((s) => s.selectedText);
  const customPrompts = useAiStore((s) => s.customPrompts);
  const quickActions = useAiStore((s) => s.quickActions);

  useEffect(() => {
    const onContext = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // Only show inside the editor / preview area.
      const region = target.closest("[data-edit-region]");
      if (!region) {
        setPos(null);
        return;
      }
      const sel = window.getSelection()?.toString();
      if (sel && sel.trim().length > 0) {
        setPos({ x: e.clientX, y: e.clientY });
      } else {
        setPos(null);
      }
    };
    document.addEventListener("contextmenu", onContext);
    const onDocClick = () => setPos(null);
    document.addEventListener("click", onDocClick);
    return () => {
      document.removeEventListener("contextmenu", onContext);
      document.removeEventListener("click", onDocClick);
    };
  }, []);

  if (!pos) return null;

  const ask = (promptTemplate: string) => {
    const filled = promptTemplate.replace(/\{selection\}/g, selectedText);
    useAiStore.getState().setPanelOpen(true);
    streamToConversation(filled, {
      system: "You are an editing assistant. Apply the requested transformation to the provided text and return only the resulting markdown.",
    });
    setPos(null);
  };

  const replace = async (promptTemplate: string) => {
    // Stream, then replace the selection in the editor content.
    const filled = promptTemplate.replace(/\{selection\}/g, selectedText);
    const { content, setContent, path, name } = useFileStore.getState();
    const before = content;
    setPos(null);
    useAiStore.getState().setPanelOpen(true);
    let result = "";
    await streamToConversation(filled, {
      system: "You are an editing assistant. Return ONLY the transformed markdown, no commentary.",
      onDone: (text) => {
        result = text.trim();
      },
    });
    if (result) {
      // Replace all occurrences of the selected text.
      const idx = before.indexOf(selectedText);
      if (idx >= 0) {
        const next = before.slice(0, idx) + result + before.slice(idx + selectedText.length);
        setContent(next);
      }
    }
  };

  return (
    <div
      className="glass fixed z-[70] w-56 rounded-float border border-border p-1 text-xs shadow-glow"
      style={{ left: pos.x, top: pos.y }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-text-muted">Ask AI</div>
      {quickActions.map((a) => (
        <button
          key={a.id}
          className="block w-full rounded px-2 py-1 text-left text-text hover:bg-surface-2"
          onClick={() => ask(a.prompt)}
        >
          {a.label}
        </button>
      ))}
      <div className="my-1 border-t border-border" />
      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-text-muted">Custom</div>
      {customPrompts.length === 0 && (
        <div className="px-2 py-1 text-text-muted">No custom prompts</div>
      )}
      {customPrompts.map((c) => (
        <button
          key={c.id}
          className="block w-full rounded px-2 py-1 text-left text-text hover:bg-surface-2"
          onClick={() => ask(c.body)}
          title="Click: ask · Shift+Click: replace selection"
          onMouseDown={() => {
            /* noop */
          }}
          onDoubleClick={() => replace(c.body)}
        >
          {c.title}
        </button>
      ))}
    </div>
  );
}
