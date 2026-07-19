// Shared type definitions for Marky.

export type ViewMode = "editor" | "split" | "preview";

export type ThemeId =
  | "midnight"
  | "cyberpunk"
  | "solarized"
  | "obsidian"
  | "paper";

export type FontId = "jetbrains" | "fira" | "cascadia" | "system";

export interface ThemeMeta {
  id: ThemeId;
  name: string;
  monaco: string; // registered Monaco theme name
  glow: boolean; // enable glow effects on active elements
  glass: boolean; // glassmorphism panels
  hljs: boolean; // whether code blocks use dark syntax colors (false => light)
}

export interface AIProviderConfig {
  id: string;
  type: "openai" | "anthropic" | "google" | "ollama" | "openrouter" | "custom";
  name: string;
  apiKey: string;
  baseUrl: string;
  model: string;
  headers: string; // JSON string for custom provider
  enabled: boolean;
  isDefault?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: number;
  streaming?: boolean;
  error?: boolean;
  tokens?: number;
}

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

export interface FileNode {
  name: string;
  path: string;
  isDir: boolean;
  children?: FileNode[];
}

export interface QuickAction {
  id: string;
  label: string;
  prompt: string;
  icon?: string;
}

export interface CustomPrompt {
  id: string;
  title: string;
  body: string;
}

export interface Settings {
  theme: ThemeId;
  accentOverride: string | null; // custom accent color hex
  fontMono: FontId;
  editorFontSize: number;
  wordWrap: boolean;
  lineNumbers: boolean;
  minimap: boolean;
  vimMode: boolean;
  emacsMode: boolean;
  autoSave: boolean;
  autoSaveInterval: number; // seconds
  crtEffect: boolean;
  syncScroll: boolean;
  previewZoom: number; // percent
  editorZoom: number; // percent
  activeProviderId: string | null;
  defaultExportDir: string | null;
}

export interface TocItem {
  id: string;
  text: string;
  level: number;
}
