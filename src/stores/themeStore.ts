import { create } from "zustand";
import type { ThemeId, FontId } from "@/types";
import { THEMES, themeMeta, FONT_STACKS } from "@/lib/themes";

interface ThemeState {
  theme: ThemeId;
  accentOverride: string | null;
  fontMono: FontId;
  setTheme: (t: ThemeId) => void;
  cycleTheme: () => void;
  setAccent: (hex: string | null) => void;
  setFont: (f: FontId) => void;
  apply: () => void;
}

function applyTheme(theme: ThemeId, accent: string | null, font: FontId) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  if (accent) root.style.setProperty("--marky-accent", accent);
  else root.style.removeProperty("--marky-accent");
  root.style.setProperty("--marky-font-mono", FONT_STACKS[font]);
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "midnight",
  accentOverride: null,
  fontMono: "jetbrains",
  setTheme: (theme) => {
    set({ theme });
    applyTheme(theme, get().accentOverride, get().fontMono);
  },
  cycleTheme: () => {
    const idx = THEMES.findIndex((t) => t.id === get().theme);
    const next = THEMES[(idx + 1) % THEMES.length].id;
    set({ theme: next });
    applyTheme(next, get().accentOverride, get().fontMono);
  },
  setAccent: (accent) => {
    set({ accentOverride: accent });
    applyTheme(get().theme, accent, get().fontMono);
  },
  setFont: (font) => {
    set({ fontMono: font });
    applyTheme(get().theme, get().accentOverride, font);
  },
  apply: () => applyTheme(get().theme, get().accentOverride, get().fontMono),
}));

export { themeMeta };
