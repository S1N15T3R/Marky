import { useEffect } from "react";
import { useSettingsStore, DEFAULT_SETTINGS } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { useAiStore } from "@/stores/aiStore";
import { storeGet, storeSet, initDb, dbGetRecent } from "@/lib/platform";
import type { Settings, AIProviderConfig, CustomPrompt, QuickAction } from "@/types";
import { defaultProviders } from "@/lib/ai-providers/defaults";
import { DEFAULT_QUICK_ACTIONS } from "@/stores/aiStore";
import { useFileStore } from "@/stores/fileStore";

// Loads persisted state on boot and persists changes whenever they change.
export function usePersistence() {
  const setAll = useSettingsStore((s) => s.setAll);
  const setProviders = useAiStore((s) => s.setProviders);
  const setCustomPrompts = useAiStore((s) => s.setCustomPrompts);
  const setQuickActions = useAiStore((s) => s.setQuickActions);
  const setRecent = useFileStore((s) => s.setRecent);

  // Load once.
  useEffect(() => {
    (async () => {
      await initDb();
      const settings = await storeGet<Settings>("settings", DEFAULT_SETTINGS);
      setAll(settings);
      const providers = await storeGet<AIProviderConfig[]>("providers", defaultProviders());
      setProviders(providers);
      const customPrompts = await storeGet<CustomPrompt[]>("customPrompts", []);
      setCustomPrompts(customPrompts);
      const quickActions = await storeGet<QuickAction[]>("quickActions", DEFAULT_QUICK_ACTIONS);
      setQuickActions(quickActions);
      const recent = await dbGetRecent();
      setRecent(recent.map((r) => ({ path: r.path, name: r.name, lastOpened: r.last_opened })));
    })();
  }, []);

  // Persist settings.
  const settings = useSettingsStore((s) => s.settings);
  useEffect(() => {
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
    storeSet("providers", providers);
  }, [providers]);

  const customPrompts = useAiStore((s) => s.customPrompts);
  useEffect(() => {
    storeSet("customPrompts", customPrompts);
  }, [customPrompts]);

  const quickActions = useAiStore((s) => s.quickActions);
  useEffect(() => {
    storeSet("quickActions", quickActions);
  }, [quickActions]);
}
