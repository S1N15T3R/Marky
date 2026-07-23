import { useEffect, useRef, useState } from "react";
import { useAiStore } from "@/stores/aiStore";
import { useFileStore } from "@/stores/fileStore";
import { useAi } from "@/hooks/useAi";
import { runAgent } from "@/lib/ai-agent/agent";
import { useSettingsStore } from "@/stores/settingsStore";
import { Button, Input, Select } from "@/components/ui/primitives";
import { PROVIDERS } from "@/lib/ai-providers";
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
        } ${msg.error ? "border-red-500/60" : ""}`}
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
  const sessions = useAiStore((s) => s.sessions);
  const activeSessionId = useAiStore((s) => s.activeSessionId);
  const newSession = useAiStore((s) => s.newSession);
  const switchSession = useAiStore((s) => s.switchSession);
  const deleteSession = useAiStore((s) => s.deleteSession);
  const renameSession = useAiStore((s) => s.renameSession);
  const clearActiveSession = useAiStore((s) => s.clearActiveSession);
  const providers = useAiStore((s) => s.providers);
  const upsertProvider = useAiStore((s) => s.upsertProvider);
  const activeProviderId = useSettingsStore((s) => s.settings.activeProviderId);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const busy = useAiStore((s) => s.busy);
  const agentMode = useAiStore((s) => s.agentMode);
  const setAgentMode = useAiStore((s) => s.setAgentMode);

  const { runStream, cancel } = useAi();
  const scrollRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === activeSessionId) || sessions[0];
  const messages = active?.messages || [];
  const [input, setInput] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  if (!panelOpen) return null;

  const activeProv = providers.find((p) => p.id === activeProviderId);
  const activeLabel = activeProv?.name || "none";
  const handler = activeProv ? PROVIDERS[activeProv.type] : undefined;

  const send = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    if (agentMode) await runAgent(text);
    else await runStream(text);
  };

  const startRename = (id: string, title: string) => {
    setRenaming(id);
    setRenameVal(title);
  };
  const commitRename = () => {
    if (renaming && renameVal.trim()) renameSession(renaming, renameVal.trim());
    setRenaming(null);
  };

  return (
    <div className="flex h-full w-full flex-col bg-surface">
      {/* Top: sessions rail + header */}
      <div className="flex h-full">
        {/* Session list */}
        <div className="flex w-28 shrink-0 flex-col border-r border-border bg-surface-2">
          <button
            className="m-2 rounded border border-border py-1 text-[11px] text-text-muted hover:border-accent hover:text-accent"
            onClick={() => newSession()}
            title="New chat"
          >
            + New chat
          </button>
          <div className="flex-1 space-y-1 overflow-y-auto px-1 pb-2">
            {sessions.length === 0 && (
              <div className="px-1 py-2 text-[10px] text-text-muted">No chats yet</div>
            )}
            {sessions.map((s) => (
              <div
                key={s.id}
                className={`group flex cursor-pointer items-center gap-1 rounded px-1.5 py-1 text-[11px] ${
                  s.id === activeSessionId ? "bg-accent/15 text-accent" : "text-text-muted hover:bg-surface"
                }`}
                onClick={() => switchSession(s.id)}
                title={s.title}
              >
                {renaming === s.id ? (
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(e) => e.key === "Enter" && commitRename()}
                    className="w-full bg-transparent outline-none"
                  />
                ) : (
                  <>
                    <span className="truncate flex-1">{s.title}</span>
                    <span
                      className="hidden text-[10px] hover:text-text group-hover:inline"
                      onClick={(e) => { e.stopPropagation(); startRename(s.id, s.title); }}
                    >✎</span>
                    <span
                      className="hidden text-[10px] hover:text-red-400 group-hover:inline"
                      onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                    >🗑</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Chat column */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header: agent toggle + provider + close */}
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <span className="shrink-0 text-xs font-bold text-accent">✦ AI</span>
            <button
              className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold border ${
                agentMode
                  ? "border-accent bg-accent/20 text-accent"
                  : "border-border text-text-muted hover:text-text"
              }`}
              onClick={() => setAgentMode(!agentMode)}
              title="Toggle agentic mode (read/write files + editor)"
            >
              ⚡ Agent
            </button>
            <Select
              className="h-7 flex-1 text-[11px]"
              value={activeProviderId || ""}
              onChange={(e) => setSettings({ activeProviderId: e.target.value })}
              title="Active provider"
            >
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.enabled ? "" : " (off)"}
                </option>
              ))}
            </Select>
            <button
              className="shrink-0 text-text-muted hover:text-text"
              onClick={() => setPanelOpen(false)}
              title="Close (Ctrl+J)"
            >
              ✕
            </button>
          </div>

          {/* Model picker row */}
          <div className="flex items-center gap-2 border-b border-border px-3 py-2">
            <span className="shrink-0 text-[10px] uppercase tracking-wide text-text-muted">Model</span>
            <Select
              className="h-7 flex-1 text-[11px]"
              value={activeProv?.model || ""}
              onChange={(e) => activeProv && upsertProvider({ ...activeProv, model: e.target.value })}
              title="Model"
            >
              {(handler?.defaultModels || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              {activeProv && handler && !handler.defaultModels.includes(activeProv.model) && (
                <option value={activeProv.model}>{activeProv.model} (custom)</option>
              )}
            </Select>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                const m = prompt("Model name (e.g. llama3.1, qwen3:4b)");
                if (m && activeProv) upsertProvider({ ...activeProv, model: m });
              }}
              title="Set a custom model name"
            >
              Custom
            </Button>
          </div>

          {/* Conversation */}
          <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && (
              <div className="mt-6 text-center text-xs text-text-muted">
                {agentMode ? (
                  <>⚡ <span className="text-accent">Agent mode</span>: ask it to read, edit, or write files in your workspace.</>
                ) : (
                  <>Ask anything, or select text and use the right-click <span className="text-accent">Ask AI</span> menu.</>
                )}
              </div>
            )}
            {messages.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
          </div>

          {/* Footer: clear + input */}
          <div className="border-t border-border p-2">
            {busy && (
              <div className="mb-2 flex items-center justify-between text-[11px] text-text-muted">
                <span className="inline-flex items-center gap-1">
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  <span className="typing-dot" />
                  {agentMode ? "agent working…" : "generating…"}
                </span>
                <Button size="sm" variant="outline" onClick={cancel}>
                  Cancel
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" onClick={() => clearActiveSession()} title="Clear this chat">
                Clear
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder={agentMode ? "Tell the agent what to change…" : "Ask Marky…  (Enter to send)"}
              />
              <Button variant="accent" onClick={send} disabled={busy}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
