import { useState } from "react";
import { Modal, Button, Input, Select, Label, Textarea } from "@/components/ui/primitives";
import { useSettingsStore } from "@/stores/settingsStore";
import { useThemeStore } from "@/stores/themeStore";
import { useAiStore } from "@/stores/aiStore";
import { THEMES, FONT_STACKS } from "@/lib/themes";
import { PROVIDERS } from "@/lib/ai-providers";
import type { AIProviderConfig, CustomPrompt, FontId, ThemeId } from "@/types";
import { uid } from "@/lib/utils";

type Tab = "appearance" | "editor" | "ai" | "export" | "about";

export default function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("appearance");
  const settings = useSettingsStore((s) => s.settings);
  const setSettings = useSettingsStore((s) => s.setSettings);
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAccent = useThemeStore((s) => s.setAccent);
  const setFont = useThemeStore((s) => s.setFont);

  const providers = useAiStore((s) => s.providers);
  const upsertProvider = useAiStore((s) => s.upsertProvider);
  const removeProvider = useAiStore((s) => s.removeProvider);

  const customPrompts = useAiStore((s) => s.customPrompts);
  const setCustomPrompts = useAiStore((s) => s.setCustomPrompts);

  return (
    <Modal open={open} onClose={onClose} title="⚙ Settings">
      <div className="flex gap-4">
        <nav className="w-36 shrink-0 space-y-1 border-r border-border pr-2">
          {(["appearance", "editor", "ai", "export", "about"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`block w-full rounded px-2 py-1.5 text-left text-xs capitalize ${
                tab === t ? "bg-accent/15 text-accent" : "text-text-muted hover:bg-surface-2"
              }`}
            >
              {t}
            </button>
          ))}
        </nav>

        <div className="flex-1 space-y-4">
          {tab === "appearance" && (
            <>
              <div>
                <Label>Theme</Label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setSettings({ theme: t.id as ThemeId });
                        setTheme(t.id as ThemeId);
                      }}
                      className={`rounded-panel border px-3 py-2 text-xs ${
                        settings.theme === t.id ? "border-accent text-accent" : "border-border text-text-muted"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Custom accent color</Label>
                <div className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accentOverride || "#00ff41"}
                    onChange={(e) => {
                      setSettings({ accentOverride: e.target.value });
                      setAccent(e.target.value);
                    }}
                    className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setSettings({ accentOverride: null });
                      setAccent(null);
                    }}
                  >
                    Reset
                  </Button>
                </div>
              </div>
              <div>
                <Label>UI / Editor font</Label>
                <Select
                  className="mt-1"
                  value={settings.fontMono}
                  onChange={(e) => {
                    setSettings({ fontMono: e.target.value as FontId });
                    setFont(e.target.value as FontId);
                  }}
                >
                  {Object.entries(FONT_STACKS).map(([id, stack]) => (
                    <option key={id} value={id}>
                      {id} — {stack.split(",")[0].replace(/'/g, "")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-panel border border-border px-3 py-2">
                <span className="text-xs">CRT scanline overlay</span>
                <Toggle
                  checked={settings.crtEffect}
                  onChange={(v) => setSettings({ crtEffect: v })}
                />
              </div>
              <div className="flex items-center justify-between rounded-panel border border-border px-3 py-2">
                <span className="text-xs">Sync scroll (editor ↔ preview)</span>
                <Toggle checked={settings.syncScroll} onChange={(v) => setSettings({ syncScroll: v })} />
              </div>
            </>
          )}

          {tab === "editor" && (
            <>
              <SliderRow label="Editor font size" value={settings.editorFontSize} min={10} max={28} unit="px"
                onChange={(v) => setSettings({ editorFontSize: v })} />
              <SliderRow label="Preview zoom" value={settings.previewZoom} min={80} max={160} unit="%"
                onChange={(v) => setSettings({ previewZoom: v })} />
              <ToggleRow label="Word wrap" value={settings.wordWrap} onChange={(v) => setSettings({ wordWrap: v })} />
              <ToggleRow label="Line numbers" value={settings.lineNumbers} onChange={(v) => setSettings({ lineNumbers: v })} />
              <ToggleRow label="Minimap" value={settings.minimap} onChange={(v) => setSettings({ minimap: v })} />
              <ToggleRow label="Vim keybindings" value={settings.vimMode} onChange={(v) => setSettings({ vimMode: v, emacsMode: v ? false : settings.emacsMode })} />
              <ToggleRow label="Emacs keybindings" value={settings.emacsMode} onChange={(v) => setSettings({ emacsMode: v, vimMode: v ? false : settings.vimMode })} />
              <ToggleRow label="Auto-save" value={settings.autoSave} onChange={(v) => setSettings({ autoSave: v })} />
              {settings.autoSave && (
                <SliderRow label="Auto-save interval" value={settings.autoSaveInterval} min={1} max={60} unit="s"
                  onChange={(v) => setSettings({ autoSaveInterval: v })} />
              )}
            </>
          )}

          {tab === "ai" && (
            <>
              <Label>AI Providers</Label>
              <div className="space-y-3">
                {providers.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    onChange={(np) => upsertProvider(np)}
                    onRemove={() => removeProvider(p.id)}
                  />
                ))}
              </div>
              <Label className="mt-4 block">Default provider for actions</Label>
              <Select
                value={settings.activeProviderId || ""}
                onChange={(e) => setSettings({ activeProviderId: e.target.value })}
              >
                {providers.filter((p) => p.enabled).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                {providers.filter((p) => p.enabled).length === 0 && (
                  <option value="">(none enabled)</option>
                )}
              </Select>

              <div className="mt-4 border-t border-border pt-3">
                <Label>Custom prompt templates</Label>
                <CustomPromptEditor
                  prompts={customPrompts}
                  onChange={setCustomPrompts}
                />
              </div>
            </>
          )}

          {tab === "export" && (
            <>
              <p className="text-xs text-text-muted">
                Use the toolbar <span className="text-accent">Export ▾</span> menu, or the keyboard shortcuts:
              </p>
              <ul className="ml-4 list-disc space-y-1 text-xs text-text-muted">
                <li>Ctrl+Shift+C — Copy preview as HTML</li>
                <li>Ctrl+E — Export to HTML file</li>
                <li>Ctrl+Shift+E — Export to PDF (print dialog)</li>
              </ul>
              <div className="rounded-panel border border-border p-3 text-xs text-text-muted">
                API keys are stored in Tauri's encrypted secure store (or browser localStorage in
                dev mode) — never in plain text on disk.
              </div>
            </>
          )}

          {tab === "about" && (
            <div className="space-y-2 text-xs text-text-muted">
              <p className="text-text">
                <span className="glitch text-accent" data-text="MARKY">MARKY</span> v1.0.0
              </p>
              <p>A cross-platform markdown editor with deep AI integration.</p>
              <p>Built with Tauri v2 · React · Monaco · Marked · KaTeX · Mermaid.</p>
              <p>MIT License.</p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 rounded-full transition ${checked ? "bg-accent" : "bg-surface-2"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-black transition-all ${
          checked ? "left-4" : "left-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-panel border border-border px-3 py-2">
      <span className="text-xs">{label}</span>
      <Toggle checked={value} onChange={onChange} />
    </div>
  );
}

function SliderRow({
  label, value, min, max, unit, onChange,
}: { label: string; value: number; min: number; max: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div className="rounded-panel border border-border px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span>{label}</span>
        <span className="text-accent">{value}{unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[color:var(--marky-accent)]"
      />
    </div>
  );
}

function ProviderCard({
  provider, onChange, onRemove,
}: {
  provider: AIProviderConfig; onChange: (p: AIProviderConfig) => void; onRemove: () => void;
}) {
  const handler = PROVIDERS[provider.type];
  return (
    <div className="rounded-panel border border-border p-3">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-text">{handler.label}</span>
          <Toggle checked={provider.enabled} onChange={(v) => onChange({ ...provider, enabled: v })} />
        </div>
        <button className="text-[11px] text-text-muted hover:text-red-400" onClick={onRemove}>
          Remove
        </button>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {provider.type !== "ollama" && (
          <Input
            placeholder="API Key"
            type="password"
            value={provider.apiKey}
            onChange={(e) => onChange({ ...provider, apiKey: e.target.value })}
          />
        )}
        {provider.type === "custom" ? (
          <Input
            placeholder="Base URL (e.g. https://api.example.com/v1)"
            value={provider.baseUrl}
            onChange={(e) => onChange({ ...provider, baseUrl: e.target.value })}
          />
        ) : (
          <Input
            placeholder={handler.defaultBaseUrl}
            value={provider.baseUrl === handler.defaultBaseUrl ? "" : provider.baseUrl}
            onChange={(e) => onChange({ ...provider, baseUrl: e.target.value || handler.defaultBaseUrl })}
          />
        )}
        <div className="flex gap-2">
          <Select value={provider.model} onChange={(e) => onChange({ ...provider, model: e.target.value })}>
            {handler.defaultModels.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            {!handler.defaultModels.includes(provider.model) && (
              <option value={provider.model}>{provider.model} (custom)</option>
            )}
          </Select>
          <Button size="sm" variant="ghost" onClick={() => onChange({ ...provider, model: prompt("Model name") || provider.model })}>
            Custom
          </Button>
        </div>
        {provider.type === "custom" && (
          <Textarea
            placeholder='Extra headers JSON: {"X-Custom": "value"}'
            rows={2}
            value={provider.headers}
            onChange={(e) => onChange({ ...provider, headers: e.target.value })}
          />
        )}
      </div>
    </div>
  );
}

function CustomPromptEditor({
  prompts, onChange,
}: { prompts: CustomPrompt[]; onChange: (p: CustomPrompt[]) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  return (
    <div className="mt-2 space-y-2">
      <div className="space-y-2">
        <Input placeholder="Template title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <Textarea placeholder="Prompt body — use {selection} for the selected text" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
        <Button
          size="sm"
          variant="accent"
          disabled={!title.trim() || !body.trim()}
          onClick={() => {
            onChange([...prompts, { id: uid(), title: title.trim(), body: body.trim() }]);
            setTitle(""); setBody("");
          }}
        >
          + Add template
        </Button>
      </div>
      <div className="space-y-1">
        {prompts.map((p) => (
          <div key={p.id} className="flex items-center justify-between rounded border border-border px-2 py-1 text-xs">
            <span className="text-text">{p.title}</span>
            <button className="text-text-muted hover:text-red-400" onClick={() => onChange(prompts.filter((x) => x.id !== p.id))}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
