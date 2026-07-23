import { useEffect, useRef } from "react";
import { useSettingsStore, DEFAULT_SETTINGS } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { useAiStore, DEFAULT_QUICK_ACTIONS } from "@/stores/aiStore";
import { storeGet, storeSet, initDb, dbGetRecent } from "@/lib/platform";
import type { Settings, AIProviderConfig, CustomPrompt, QuickAction, ChatSession } from "@/types";
import { defaultProviders } from "@/lib/ai-providers/defaults";
import { useFileStore } from "@/stores/fileStore";
import { uid } from "@/lib/utils";

const DEFAULT_SESSION: ChatSession = {
  id: uid(),
  title: "Chat 1",
  messages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// Loads persisted state on boot and persists changes whenever they change.
export function usePersistence() {
  const setAll = useSettingsStore((s) => s.setAll);
  const setProviders = useAiStore((s) => s.setProviders);
  const setCustomPrompts = useAiStore((s) => s.setCustomPrompts);
  const setQuickActions = useAiStore((s) => s.setQuickActions);
  const setSessions = useAiStore((s) => s.setSessions);
  const setActiveSessionId = useAiStore((s) => s.setActiveSessionId);
  const setAgentMode = useAiStore((s) => s.setAgentMode);
  const setRecent = useFileStore((s) => s.setRecent);

  // Gate persistence until the initial load has completed. Without this, the
  // persist effects fire on first mount with the in-memory defaults and
  // overwrite the saved data on disk before the async load resolves — which
  // would wipe the user's model/API key on every restart.
  const hydrated = useRef(false);

  // Load once.
  useEffect(() => {
    (async () => {
      // Each load is independent: a failure in one (e.g. the SQL recents
      // query) must not prevent providers/settings from loading, or the
      // user's saved model/API key would be lost on restart.
      const safe = async <T,>(fn: () => Promise<T>, fb: T): Promise<T> => {
        try {
          return await fn();
        } catch {
          return fb;
        }
      };

      const settings = await safe(() => storeGet<Settings>("settings", DEFAULT_SETTINGS), DEFAULT_SETTINGS);
      setAll(settings);
      const providers = await safe(() => storeGet<AIProviderConfig[]>("providers", defaultProviders()), defaultProviders());
      setProviders(providers);
      const customPrompts = await safe(() => storeGet<CustomPrompt[]>("customPrompts", []), [] as CustomPrompt[]);
      setCustomPrompts(customPrompts);
      const quickActions = await safe(() => storeGet<QuickAction[]>("quickActions", DEFAULT_QUICK_ACTIONS), DEFAULT_QUICK_ACTIONS);
      setQuickActions(quickActions);

      const savedSessions = await safe(() => storeGet<ChatSession[]>("aiSessions", []), [] as ChatSession[]);
      const sessions = savedSessions.length ? savedSessions : [DEFAULT_SESSION];
      setSessions(sessions);
      const savedActive = await safe(() => storeGet<string | null>("aiActiveSession", null), null);
      setActiveSessionId(savedActive && sessions.some((s) => s.id === savedActive) ? savedActive : sessions[0].id);
      const savedAgent = await safe(() => storeGet<boolean>("agentMode", false), false);
      setAgentMode(savedAgent);
      try {
        await initDb();
        const recent = await dbGetRecent();
        setRecent(recent.map((r) => ({ path: r.path, name: r.name, lastOpened: r.last_opened })));
      } catch {
        /* recents are best-effort */
      }

      // Only now are we allowed to persist.
      hydrated.current = true;
    })();
  }, []);

  // Persist settings.
  const settings = useSettingsStore((s) => s.settings);
  useEffect(() => {
    if (!hydrated.current) return;
    storeSet("settings", settings).then(() => {
      const t = useThemeStore.getState();
      t.setTheme(settings.theme);
      t.setAccent(settings.accentOverride);
      t.setFont(settings.fontMono);
    });
  }, [settings]);

  // Persist providers.
  const providers = useAiStore((s) => s.providers);
  useEffect(() => {
    if (!hydrated.current) return;
    storeSet("providers", providers);
  }, [providers]);

  const customPrompts = useAiStore((s) => s.customPrompts);
  useEffect(() => {
    if (!hydrated.current) return;
    storeSet("customPrompts", customPrompts);
  }, [customPrompts]);

  const quickActions = useAiStore((s) => s.quickActions);
  useEffect(() => {
    if (!hydrated.current) return;
    storeSet("quickActions", quickActions);
  }, [quickActions]);

  // Persist chat sessions.
  const sessions = useAiStore((s) => s.sessions);
  useEffect(() => {
    if (!hydrated.current) return;
    storeSet("aiSessions", sessions);
  }, [sessions]);

  const activeSessionId = useAiStore((s) => s.activeSessionId);
  useEffect(() => {
    if (!hydrated.current) return;
    storeSet("aiActiveSession", activeSessionId);
  }, [activeSessionId]);

  const agentMode = useAiStore((s) => s.agentMode);
  useEffect(() => {
    if (!hydrated.current) return;
    storeSet("agentMode", agentMode);
  }, [agentMode]);
}
