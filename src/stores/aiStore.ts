import { create } from "zustand";
import type { AIProviderConfig, ChatMessage, CustomPrompt, QuickAction } from "@/types";
import { defaultProviders } from "@/lib/ai-providers/defaults";
import { uid } from "@/lib/utils";

const DEFAULT_QUICK_ACTIONS: QuickAction[] = [
  { id: "improve", label: "Improve writing", prompt: "Improve the writing of the following text while preserving its meaning. Keep markdown formatting.\n\n{selection}", icon: "Sparkles" },
  { id: "grammar", label: "Fix grammar", prompt: "Fix grammar and spelling errors in the following text. Keep markdown formatting.\n\n{selection}", icon: "CheckCheck" },
  { id: "shorter", label: "Make shorter", prompt: "Rewrite the following text to be more concise while keeping the key information.\n\n{selection}", icon: "Minimize" },
  { id: "longer", label: "Make longer", prompt: "Expand the following text with more detail and explanation while keeping markdown formatting.\n\n{selection}", icon: "Maximize" },
  { id: "explain", label: "Explain this", prompt: "Explain the following text in clear, simple terms:\n\n{selection}", icon: "BookOpen" },
  { id: "summary", label: "Generate summary", prompt: "Write a concise summary of the following text as bullet points:\n\n{selection}", icon: "List" },
  { id: "table", label: "Convert to table", prompt: "Convert the following information into a GitHub-flavored markdown table:\n\n{selection}", icon: "Table" },
];

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface AiState {
  providers: AIProviderConfig[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  busy: boolean;
  abort: AbortController | null;
  quickActions: QuickAction[];
  customPrompts: CustomPrompt[];
  panelOpen: boolean;
  selectedText: string;
  agentMode: boolean;

  setProviders: (p: AIProviderConfig[]) => void;
  upsertProvider: (p: AIProviderConfig) => void;
  removeProvider: (id: string) => void;
  setPanelOpen: (open: boolean) => void;
  setAgentMode: (on: boolean) => void;
  setBusy: (b: boolean) => void;
  setAbort: (a: AbortController | null) => void;

  newSession: (title?: string) => string;
  switchSession: (id: string) => void;
  deleteSession: (id: string) => void;
  renameSession: (id: string, title: string) => void;
  setSessions: (s: ChatSession[]) => void;
  setActiveSessionId: (id: string | null) => void;
  activeSession: () => ChatSession;

  pushMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  clearActiveSession: () => void;
  setQuickActions: (a: QuickAction[]) => void;
  setCustomPrompts: (p: CustomPrompt[]) => void;
  setSelectedText: (t: string) => void;
}

const makeSession = (title?: string): ChatSession => {
  const now = Date.now();
  return { id: uid(), title: title || "New chat", messages: [], createdAt: now, updatedAt: now };
};

export const useAiStore = create<AiState>((set, get) => ({
  providers: defaultProviders(),
  sessions: [],
  activeSessionId: null,
  busy: false,
  abort: null,
  quickActions: DEFAULT_QUICK_ACTIONS,
  customPrompts: [],
  panelOpen: false,
  selectedText: "",
  agentMode: false,

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
  removeProvider: (id) => set((s) => ({ providers: s.providers.filter((p) => p.id !== id) })),
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setAgentMode: (agentMode) => set({ agentMode }),
  setBusy: (busy) => set({ busy }),
  setAbort: (abort) => set({ abort }),

  newSession: (title) => {
    const s = makeSession(title);
    set((st) => ({ sessions: [s, ...st.sessions], activeSessionId: s.id }));
    return s.id;
  },
  switchSession: (id) => set({ activeSessionId: id }),
  deleteSession: (id) =>
    set((st) => {
      const sessions = st.sessions.filter((x) => x.id !== id);
      const activeSessionId =
        st.activeSessionId === id ? (sessions[0]?.id ?? null) : st.activeSessionId;
      return { sessions, activeSessionId };
    }),
  renameSession: (id, title) =>
    set((st) => ({
      sessions: st.sessions.map((x) => (x.id === id ? { ...x, title } : x)),
    })),
  setSessions: (sessions) => set({ sessions }),
  setActiveSessionId: (activeSessionId) => set({ activeSessionId }),
  activeSession: () => {
    const st = get();
    let sess = st.sessions.find((x) => x.id === st.activeSessionId);
    if (!sess) {
      sess = makeSession();
      set({ sessions: [sess, ...st.sessions], activeSessionId: sess.id });
    }
    return sess;
  },

  pushMessage: (msg) =>
    set((st) => ({
      activeSessionId: st.activeSessionId || (st.sessions[0]?.id ?? null),
      sessions: st.sessions.map((s) =>
        s.id === (st.activeSessionId ?? st.sessions[0]?.id)
          ? { ...s, messages: [...s.messages, msg], updatedAt: Date.now() }
          : s
      ),
    })),
  updateMessage: (id, patch) =>
    set((st) => ({
      sessions: st.sessions.map((s) => {
        if (s.id !== (st.activeSessionId ?? st.sessions[0]?.id)) return s;
        return {
          ...s,
          updatedAt: Date.now(),
          messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        };
      }),
    })),
  clearActiveSession: () =>
    set((st) => ({
      sessions: st.sessions.map((s) =>
        s.id === (st.activeSessionId ?? st.sessions[0]?.id) ? { ...s, messages: [] } : s
      ),
    })),
  setQuickActions: (quickActions) => set({ quickActions }),
  setCustomPrompts: (customPrompts) => set({ customPrompts }),
  setSelectedText: (selectedText) => set({ selectedText }),
}));

export { DEFAULT_QUICK_ACTIONS };
