import { create } from "zustand";
import type { Settings } from "@/types";

const DEFAULT_SETTINGS: Settings = {
  theme: "midnight",
  accentOverride: null,
  fontMono: "jetbrains",
  editorFontSize: 14,
  wordWrap: true,
  lineNumbers: true,
  minimap: false,
  vimMode: false,
  emacsMode: false,
  autoSave: true,
  autoSaveInterval: 5,
  crtEffect: false,
  syncScroll: true,
  previewZoom: 100,
  editorZoom: 100,
  activeProviderId: "prov-openai",
  defaultExportDir: null,
};

interface SettingsState {
  settings: Settings;
  setSettings: (patch: Partial<Settings>) => void;
  setAll: (s: Settings) => void;
  reset: () => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
  setAll: (settings) => set({ settings }),
  reset: () => set({ settings: DEFAULT_SETTINGS }),
}));

export { DEFAULT_SETTINGS };
