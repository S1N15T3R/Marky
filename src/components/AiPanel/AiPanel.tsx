import { useEffect, useRef, useState } from "react";
import { useAiStore } from "@/stores/aiStore";
import { useFileStore } from "@/stores/fileStore";
import { useAi } from "@/hooks/useAi";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button, Input } from "@/components/ui/primitives";
import { copyText } from "@/lib/platform";
import type { ChatMessage } from "@/types";

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex fade-in ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[88%] rounded-panel border px-3 py-2 text-xs ${
          isUser
            ? "border-accent/40 bg-accent/10 text-text"
            : "border-border bg-surface-2 text-text"
        }`}
      >
        <div className="mb-1 text-[10px] uppercase tracking-wide text-text-muted">
          {isUser ? "you" : "marky"}
        </div>
        <div className="whitespace-pre-wrap break-words">
          {msg.streaming && !msg.content ? (
            <span className="inline-flex gap-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
            </span>
          ) : (
            msg.content
          )}
        </div>
        {msg.tokens != null && !msg.streaming && (
          <div className="mt-1 text-right text-[10px] text-text-muted">{msg.tokens} tok</div>
        )}
      </div>
    </div>
  );
}

export default function AiPanel() {
  const panelOpen = useAiStore((s) => s.panelOpen);
  const setPanelOpen = useAiStore((s) => s.setPanelOpen);
  const conversations = useAiStore((s) => s.conversations);
  const providers = useAiStore((s) => s.providers);
  const activeProviderId = useSettingsStore((s) => s.settings.activeProviderId);
  const clearConversation = useAiStore((s) => s.clearConversation);
  const { runStream, cancel, activeProvider } = useAi();
  const busy = useAiStore((s) => s.busy);

  const fileKey = useFileStore((s) => s.path) || "untitled";
  const messages = conversations[fileKey] || [];
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (!panelOpen) return null;

  const provider = activeProvider();
  const activeLabel =
    providers.find((p) => p.id === activeProviderId)?.name ||
    provider?.name ||
    "none";

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    await runStream(text);
  };

  return (
    <div className="flex h-full w-full flex-col border-l border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-bold text-accent">✦ AI · {activeLabel}</span>
        <div className="flex gap-1">
          <Button size="sm" variant="ghost" onClick={() => clearConversation(fileKey)}>
            Clear
          </Button>
          <button className="text-text-muted hover:text-text" onClick={() => setPanelOpen(false)}>
            ✕
          </button>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.length === 0 && (
          <div className="mt-6 text-center text-xs text-text-muted">
            Ask anything about this file, or select text and use the
            <br /> right-click <span className="text-accent">Ask AI</span> menu.
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
      </div>

      <div className="border-t border-border p-2">
        {busy && (
          <div className="mb-2 flex items-center justify-between text-[11px] text-text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              generating…
            </span>
            <Button size="sm" variant="outline" onClick={cancel}>
              Cancel
            </Button>
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Ask Marky…  (Enter to send)"
          />
          <Button variant="accent" onClick={send} disabled={busy}>
            Send
          </Button>
        </div>
      </div>
    </div>
  );
}

export { copyText };
