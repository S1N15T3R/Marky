import { useAiStore } from "@/stores/aiStore";
import { useFileStore } from "@/stores/fileStore";
import { streamToConversation } from "@/lib/ai-engine";

// Runs a quick action / custom prompt template against the current selection.
export function runQuickAction(promptTemplate: string) {
  const selection = useAiStore.getState().selectedText || useFileStore.getState().content;
  const filled = promptTemplate.replace(/\{selection\}/g, selection);
  useAiStore.getState().setPanelOpen(true);
  return streamToConversation(filled, {
    system:
      "You are an editing assistant. Apply the requested transformation to the provided text and return only the resulting markdown.",
  });
}

export function QuickActionsToolbar() {
  const quickActions = useAiStore((s) => s.quickActions);
  const customPrompts = useAiStore((s) => s.customPrompts);
  const setPanelOpen = useAiStore((s) => s.setPanelOpen);

  return (
    <div className="flex flex-wrap items-center gap-1 border-b border-border bg-surface px-2 py-1">
      <span className="mr-1 text-[10px] uppercase tracking-wider text-text-muted">AI</span>
      {quickActions.map((a) => (
        <button
          key={a.id}
          onClick={() => runQuickAction(a.prompt)}
          className="rounded-panel border border-border px-2 py-1 text-[11px] text-text-muted hover:border-accent hover:text-accent"
          title={a.prompt}
        >
          {a.label}
        </button>
      ))}
      {customPrompts.map((c) => (
        <button
          key={c.id}
          onClick={() => runQuickAction(c.body)}
          className="rounded-panel border border-dashed border-accent/50 px-2 py-1 text-[11px] text-accent hover:bg-accent/10"
          title={c.body}
        >
          {c.title}
        </button>
      ))}
      <button
        onClick={() => setPanelOpen(true)}
        className="ml-auto rounded-panel border border-border px-2 py-1 text-[11px] text-text-muted hover:border-accent hover:text-accent"
      >
        ✦ Chat
      </button>
    </div>
  );
}
