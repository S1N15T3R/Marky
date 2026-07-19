# Marky

[![Build](https://github.com/marky-app/marky/actions/workflows/release.yml/badge.svg)](https://github.com/marky-app/marky/actions)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/marky-app/marky/releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)](#download)

**Marky** is a cross-platform desktop markdown editor and viewer for Windows and
Linux, with deep AI integration and a professional hacker aesthetic. It compiles
to a single `marky.exe` (Windows) and `Marky.deb` (Linux) for GitHub Releases.

<!-- SCREENSHOTS: add screenshots/marky-dark.png, marky-cyberpunk.png, marky-ai.png -->

## Features

- **Editor** — Monaco editor (VS Code's engine) with markdown syntax highlighting,
  line numbers, word wrap, minimap, Vim/Emacs keybindings, and zoom.
- **Live Preview** — GitHub-flavored markdown via Marked.js, sanitized with DOMPurify,
  50+ languages syntax-highlighted with highlight.js, Mermaid diagrams, KaTeX math,
  interactive task lists, and a table of contents sidebar.
- **Split View** — editor left / preview right with synced scrolling. Toggle between
  editor-only, split, and preview-only (Ctrl+1 / Ctrl+2 / Ctrl+3).
- **File Management** — open/edit/save `.md` & `.markdown`, recent files (SQLite),
  folder tree sidebar, drag-and-drop, configurable auto-save, new file.
- **AI Integration** — OpenAI, Anthropic, Google, Ollama, OpenRouter, and custom
  providers with streaming responses, per-file chat history, quick actions
  (improve, fix grammar, shorten/longer, explain, summarize, table), inline
  "Ask AI" on selection, and custom prompt templates. API keys are stored in
  Tauri's encrypted secure store.
- **Themes** — 5 built-in themes (Midnight Hacker, Cyberpunk Neon, Solarized Dark,
  Obsidian, Paper Light) with instant switching (Ctrl+Shift+T), custom accent
  color, and font selector.
- **Hacker aesthetic** — frameless window with custom traffic-light controls,
  subtle CRT scanline overlay, glitch logo, monospace UI, thin themed scrollbars.
- **Offline-first** — everything works without a network; only AI features need
  connectivity. Single-instance enforcement and auto-update ready.

## Download

Prebuilt binaries are attached to each [GitHub Release](https://github.com/marky-app/marky/releases).
A copy of the latest Linux build is also kept in the repo under [`releases/`](./releases):

- **Windows** — `marky_x64-setup.exe` (NSIS installer) and portable `.msi`
  _(built automatically by the CI workflow on a tagged release; run a Windows
  build locally to produce it — see Build from Source)_
- **Linux** — `Marky_1.0.0_amd64.deb` and `marky_1.0.0_amd64.AppImage`
  _(the `.deb` is included in [`releases/`](./releases))_

> The repository intentionally excludes build caches (`node_modules/`,
> `dist/`, `src-tauri/target/`). Only source, config, and the prebuilt
> `releases/` artifacts are committed.

## Install

### Windows

1. Download `marky_x64-setup.exe` from the latest release.
2. Run the installer and follow the prompts.
3. Launch **Marky** from the Start menu.

### Linux (Debian / Ubuntu)

From a GitHub Release, or the included local copy in [`releases/`](./releases):

```bash
sudo apt update
sudo apt install ./releases/Marky_1.0.0_amd64.deb
marky
```

Required system libraries (bundled deps assume they are present):

```bash
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0
```

For the AppImage:

```bash
chmod +x marky_1.0.0_amd64.AppImage
./marky_1.0.0_amd64.AppImage
```

## AI Provider Setup

1. Open **Settings (⚙)** → **AI** tab.
2. Enable the provider(s) you want and fill in the credentials:

   | Provider  | Fields                                            |
   |-----------|--------------------------------------------------|
   | OpenAI    | API Key, Model (`gpt-4o`, `gpt-4o-mini`)         |
   | Anthropic | API Key, Model (`claude-3-5-sonnet`, `opus`)     |
   | Google    | API Key, Model (`gemini-1.5-pro`, `flash`)       |
   | Ollama    | Base URL (`http://localhost:11434`), Model name  |
   | OpenRouter| API Key, Model                                    |
   | Custom    | Base URL, API Key, Model, extra headers (JSON)   |

3. Set the **default provider** used by quick actions.
4. Keys are stored in Tauri's encrypted secure store (or browser `localStorage`
   when running the dev web build) — never in plaintext on disk.

Use the **Quick Actions** toolbar, the **AI chat panel** (Ctrl+J), or
right-click selected text → **Ask AI**.

## Keyboard Shortcuts

| Shortcut        | Action                     |
|-----------------|----------------------------|
| Ctrl+O          | Open file                  |
| Ctrl+Shift+O    | Open folder                |
| Ctrl+S          | Save                       |
| Ctrl+Shift+S    | Save As                    |
| Ctrl+N          | New file                   |
| Ctrl+1          | Editor only                |
| Ctrl+2          | Split view                 |
| Ctrl+3          | Preview only               |
| Ctrl+B          | Toggle file sidebar        |
| Ctrl+J          | Toggle AI chat panel       |
| Ctrl+K          | Command palette            |
| Ctrl+Shift+P    | AI quick actions           |
| Ctrl+Shift+T    | Cycle themes               |
| Ctrl+= / Ctrl+- | Zoom in / out (editor)     |
| Ctrl+0          | Reset zoom                 |
| F11             | Fullscreen                 |
| Ctrl+Shift+C    | Copy preview as HTML       |
| Ctrl+E          | Export to HTML             |
| Ctrl+Shift+E    | Export to PDF              |

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://www.rust-lang.org) (stable) with the target for your platform
- Linux: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf libsoup-3.0-dev libjavascriptcoregtk-4.1-dev`
- Windows: Visual Studio 2022 with C++ desktop + MSVC, NSIS

### Steps

```bash
git clone https://github.com/marky-app/marky.git
cd marky
npm install
npm run tauri build      # produces platform bundles in src-tauri/target/*/release/bundle/
```

For a web-only dev run (no Rust toolchain needed):

```bash
npm install
npm run dev              # opens the UI in a browser (filesystem limited to in-browser fallback)
```

## Architecture

```
marky/
├── src/                     # React + TypeScript frontend
│   ├── components/          # Editor, Preview, Sidebar, AiPanel, TitleBar, StatusBar, …
│   ├── hooks/               # useTheme, useFiles, useAi, useSettings, usePersistence
│   ├── stores/              # Zustand: themeStore, fileStore, aiStore, settingsStore
│   ├── lib/                 # ai-providers, markdown-parser, platform bridge, utils
│   ├── styles/              # themes (CSS vars) + globals
│   └── App.tsx
├── src-tauri/               # Rust backend (Tauri v2)
│   ├── src/main.rs          # window, plugins, single-instance, commands
│   ├── src/commands/        # file ops (read/write/read_dir/export)
│   ├── Cargo.toml
│   └── tauri.conf.json
├── releases/                # prebuilt artifacts (e.g. Marky_1.0.0_amd64.deb)
└── .github/workflows/       # release.yml CI/CD
```

## Releasing

1. Bump `version` in `package.json` and `src-tauri/tauri.conf.json` (keep in sync).
2. Commit, then tag: `git tag v1.0.0 && git push origin v1.0.0`.
3. The **Release** workflow builds Windows (`.exe`/`.msi` via NSIS) and Linux
   (`.deb` + `.AppImage`), then drafts a GitHub Release with both attached.
4. Approve / publish the draft release from the GitHub Releases page.

> The Linux `.deb` in `releases/` is a convenience copy of the CI output; the
> authoritative artifacts are the GitHub Release assets.

## Contributing

1. Fork the repo and create a feature branch.
2. Run `npm run dev` for frontend work; `npm run tauri dev` for end-to-end.
3. Keep `npm run build` (tsc + vite) green.
4. Open a pull request against `main` with a clear description.

## License

MIT — see [LICENSE](LICENSE).
