import type { ThemeMeta, ThemeId, FontId } from "@/types";

export const THEMES: ThemeMeta[] = [
  { id: "midnight", name: "Midnight Hacker", monaco: "marky-midnight", glow: false, glass: false, hljs: true },
  { id: "cyberpunk", name: "Cyberpunk Neon", monaco: "marky-cyberpunk", glow: true, glass: false, hljs: true },
  { id: "solarized", name: "Solarized Dark", monaco: "marky-solarized", glow: false, glass: false, hljs: true },
  { id: "obsidian", name: "Obsidian", monaco: "marky-obsidian", glow: false, glass: true, hljs: true },
  { id: "paper", name: "Paper Light", monaco: "marky-paper", glow: false, glass: false, hljs: false },
];

export function themeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

export const FONT_STACKS: Record<FontId, string> = {
  jetbrains: "'JetBrains Mono', ui-monospace, monospace",
  fira: "'Fira Code', ui-monospace, monospace",
  cascadia: "'Cascadia Code', ui-monospace, monospace",
  system: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
};
