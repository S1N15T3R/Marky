import { create } from "zustand";
import type { AIProviderConfig, ChatMessage, CustomPrompt, QuickAction } from "@/types";
import { defaultProviders } from "@/lib/ai-providers/defaults";

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: "improve", label: "Improve writing", prompt: "Improve the writing of the following text while preserving its meaning. Keep markdown formatting.\n\n{selection}", icon: "Sparkles" },
  { id: "grammar", label: "Fix grammar", prompt: "Fix grammar and spelling errors in the following text. Keep markdown formatting.\n\n{selection}", icon: "CheckCheck" },
  { id: "shorter", label: "Make shorter", prompt: "Rewrite the following text to be more concise while keeping the key information.\n\n{selection}", icon: "Minimize" },
  { id: "longer", label: "Make longer", prompt: "Expand the following text with more detail and explanation while keeping markdown formatting.\n\n{selection}", icon: "Maximize" },
  { id: "explain", label: "Explain this", prompt: "Explain the following text in clear, simple terms:\n\n{selection}", icon: "BookOpen" },
  { id: "summary", label: "Generate summary", prompt: "Write a concise summary of the following text as bullet points:\n\n{selection}", icon: "List" },
  { id: "table", label: "Convert to table", prompt: "Convert the following information into a GitHub-flavored markdown table:\n\n{selection}", icon: "Table" },
];

interface AiState {
  providers: AIProviderConfig[];
  conversations: Record<string, ChatMessage[]>; // keyed by file path (or "untitled")
  activeFileKey: string;
  busy: boolean;
  abort: AbortController | null;
  quickActions: QuickAction[];
  customPrompts: CustomPrompt[];
  panelOpen: boolean;
  selectedText: string;

  setProviders: (p: AIProviderConfig[]) => void;
  upsertProvider: (p: AIProviderConfig) => void;
  removeProvider: (id: string) => void;
  setActiveFileKey: (k: string) => void;
  setPanelOpen: (open: boolean) => void;
  setBusy: (b: boolean) => void;
  setAbort: (a: AbortController | null) => void;
  pushMessage: (key: string, msg: ChatMessage) => void;
  updateMessage: (key: string, id: string, patch: Partial<ChatMessage>) => void;
  clearConversation: (key: string) => void;
  setQuickActions: (a: QuickAction[]) => void;
  setCustomPrompts: (p: CustomPrompt[]) => void;
  setSelectedText: (t: string) => void;
}

export const useAiStore = create<AiState>((set) => ({
  providers: defaultProviders(),
  conversations: {},
  activeFileKey: "untitled",
  busy: false,
  abort: null,
  quickActions: DEFAULT_QUICK_ACTIONS,
  customPrompts: [],
  panelOpen: false,
  selectedText: "",

  setProviders: (providers) => set({ providers }),
  upsertProvider: (p) =>
    set((s) => {
      const idx = s.providers.findIndex((x) => x.id === p.id);
      if (idx >= 0) {
        const next = s.providers.slice();
        next[idx] = p;
        return { providers: next };
      }
      return { providers: [...s.providers, p] };
    }),
  removeProvider: (id) =>
    set((s) => ({ providers: s.providers.filter((p) => p.id !== id) })),
  setActiveFileKey: (activeFileKey) => set({ activeFileKey }),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setBusy: (busy) => set({ busy }),
  setAbort: (abort) => set({ abort }),
  pushMessage: (key, msg) =>
    set((s) => ({
      conversations: { ...s.conversations, [key]: [...(s.conversations[key] || []), msg] },
    })),
  updateMessage: (key, id, patch) =>
    set((s) => ({
      conversations: {
        ...s.conversations,
        [key]: (s.conversations[key] || []).map((m) => (m.id === id ? { ...m, ...patch } : m)),
      },
    })),
  clearConversation: (key) =>
    set((s) => ({ conversations: { ...s.conversations, [key]: [] } })),
  setQuickActions: (quickActions) => set({ quickActions }),
  setCustomPrompts: (customPrompts) => set({ customPrompts }),
  setSelectedText: (selectedText) => set({ selectedText }),
}));

export { DEFAULT_QUICK_ACTIONS };
