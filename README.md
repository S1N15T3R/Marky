# ⚡ Marky

> A cross-platform desktop **Markdown editor + AI workspace** with a hacker
> aesthetic, a VS Code-grade editor, live preview, and a genuinely agentic AI
> that can read, edit, and write your files on command.

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](./releases)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20Linux-lightgrey.svg)](#install)

---

## ✨ What is Marky?

Marky is a fast, offline-first Markdown editor built on **Tauri v2 + React +
TypeScript** with **VS Code's Monaco editor** engine. It pairs a polished
hacker-terminal aesthetic with deep AI integration that goes beyond chat:

- **Ask mode** — ask questions about your document and get streaming answers.
- **Agent mode** — flip the `⚡ Agent` switch and the AI gains **real tools**:
  it reads the editor, edits the open file, and reads/writes files on disk to
  carry out your instructions, the way VS Code's agentic Copilot works.

Everything runs locally by default (Ollama), and cloud providers
(OpenAI / Anthropic / Google / OpenRouter / Custom) work through the same
agentic engine.

---

## 🧭 Table of Contents

- [Features](#-features)
- [Install](#-install)
  - [Linux (Debian / Ubuntu)](#linux-debian--ubuntu)
  - [Windows](#windows)
- [Quick Start](#-quick-start)
- [Using Marky](#-using-marky)
  - [The Editor](#the-editor)
  - [Live Preview](#live-preview)
  - [Resizable Layout](#resizable-layout)
  - [Files Sidebar](#files-sidebar)
  - [AI Chat & Sessions](#ai-chat--sessions)
  - [Agentic Mode (the agent)](#agentic-mode-the-agent)
  - [AI Providers](#ai-providers)
  - [Themes](#themes)
  - [Command Palette](#command-palette)
  - [Export](#export)
- [Keyboard Shortcuts](#-keyboard-shortcuts)
- [Build from Source](#-build-from-source)
- [Architecture](#-architecture)
- [License](#-license)

---

## 🎛️ Features

| Area | What you get |
|------|--------------|
| **Editor** | Monaco (VS Code's engine): Markdown syntax highlighting, line numbers, word-wrap, minimap, Vim/Emacs keybindings, zoom. |
| **Live Preview** | GitHub-flavored Markdown via Marked.js, sanitized with DOMPurify, 50+ languages highlighted by highlight.js, **Mermaid** diagrams, **KaTeX** math, interactive task lists, and a Table-of-Contents sidebar. |
| **Split View** | Editor ⇄ Preview with synced scrolling. Switch Editor-only / Split / Preview-only (`Ctrl+1` / `Ctrl+2` / `Ctrl+3`). |
| **Resizable Layout** | Drag the divider between the **Files panel** and the editor, and between the editor and the **AI panel**. Widths persist across sessions. |
| **Files Sidebar** | Open files & folders, recent files, a folder tree, drag-and-drop, configurable auto-save, new file. |
| **AI — Ask Mode** | Streaming chat about your document with per-session history. |
| **AI — Agent Mode** | Native function-calling agent with tools: `read_editor`, `write_editor`, `edit_editor`, `read_file`, `write_file`, `list_dir`, `file_exists`. Works on **every** provider. |
| **AI — Chat Sessions** | Multiple named chat sessions per workspace; switch, rename, delete, and persist them. |
| **AI Providers** | OpenAI, Anthropic, Google, Ollama, OpenRouter, and a Custom endpoint. Keys stored in Tauri's encrypted secure store. |
| **Quick Actions** | Improve writing, fix grammar, make shorter/longer, explain, summarize, convert to table. |
| **Themes** | 5 built-ins (Midnight Hacker, Cyberpunk Neon, Solarized Dark, Obsidian, Paper Light) + custom accent color and font. |
| **Hacker aesthetic** | Frameless window, custom traffic-light controls, subtle CRT scanline overlay, glitch logo, monospace UI, themed scrollbars. |
| **Offline-first** | Editor, preview, themes, and local Ollama all work with no network. Only cloud AI needs connectivity. |
| **Single-instance** | One window; re-launching focuses the existing one. |

---

## 📦 Install

Prebuilt binaries are in [`releases/`](./releases) (and on GitHub Releases):

- **Linux** → `Marky_1.0.0_amd64.deb`
- **Windows** → `Marky_1.0.0_x64-setup.exe`

### Linux (Debian / Ubuntu)

```bash
# dowload the deb bainaries file from releases/
# go to the file location in terminal and type ..
sudo apt update
sudo dpkg -i Marky_1.0.0_amd64.deb

# launch from your terminal or app menu
marky
```

Required system libraries , if not work try to install these pakages first :

```bash
sudo apt install libwebkit2gtk-4.1-0 libgtk-3-0
```

### Windows

1. Download `Marky_1.0.0_x64-setup.exe` from `releases/`.
2. Run the NSIS installer and follow the prompts.
3. Launch **Marky** from the Start menu.




## 🚀 Quick Start

```bash
# 1. Install (Linux example)
sudo apt install ./releases/Marky_1.0.0_amd64.deb

# 2. Launch
marky

# 3. Create or open a markdown file
#    Ctrl+O to open a file, or just start typing in the editor.

# 4. Open the AI panel
#    Ctrl+J  → toggle the AI chat panel.

# 5. Turn on the agent
#    Flip the ⚡ Agent switch in the AI panel, then tell it:
#    "Add a conclusion section to this document."
```

---

## 🖥️ Using Marky

### The Editor

The center pane is **Monaco**, the same engine that powers VS Code. You get:

- Markdown syntax highlighting and bracket matching
- Line numbers, code folding, and a minimap
- Vim / Emacs keybindings (configurable in Settings → Editor)
- Zoom with `Ctrl+=` / `Ctrl+-` / `Ctrl+0`

### Live Preview

The right pane renders your Markdown in real time:

- GitHub-flavored Markdown (tables, task lists, strikethrough, …)
- Fenced code blocks highlighted for 50+ languages
- ```` ```mermaid ```` diagrams and `$$…$$` KaTeX math
- A **Table of Contents** (TOC) button jumps to any heading
- Editor ↔ preview **synced scrolling**

Switch layouts with `Ctrl+1` (editor only), `Ctrl+2` (split), `Ctrl+3` (preview only).

### Resizable Layout

Marky's layout is fully draggable:

- **Files panel ↔ editor** — drag the vertical divider on the left edge.
- **Editor ↔ AI panel** — drag the vertical divider on the right edge.

Your widths are saved automatically and restored next launch.

### Files Sidebar

- **Open Folder** (`Ctrl+Shift+O`) shows a file tree.
- Recent files are tracked so you can jump back instantly.
- New file (`Ctrl+N`), Save (`Ctrl+S`), Save As (`Ctrl+Shift+S`).
- Drag a `.md` / `.markdown` file from your file manager straight into the window.

### AI Chat & Sessions

The AI panel (`Ctrl+J`) keeps **multiple chat sessions**:

- **+ New session** starts a fresh conversation.
- Sessions are listed in the panel; click to switch, rename, or delete.
- Each session stores its own message history and persists between launches.
- Ask questions about the open document — the AI sees your current file as context.

### Agentic Mode (the agent)

This is what makes Marky more than a chatbot. Flip the **`⚡ Agent`** switch
(top of the AI panel). In agent mode the AI is given **real tools** and runs a
ReAct loop: it reasons, calls a tool, observes the result, and repeats until
the task is done.

The agent's tools:

| Tool | What it does |
|------|--------------|
| `read_editor` | Read the full Markdown content of the file open in the editor. |
| `write_editor` | Replace the entire editor content with new Markdown. |
| `edit_editor` | Make a targeted find-and-replace edit in the open file. |
| `read_file` | Read any UTF-8 text file on disk by absolute path. |
| `write_file` | Write/overwrite a file on disk by absolute path. |
| `list_dir` | List files and folders under a directory. |
| `file_exists` | Check whether a path exists (returns true/false). |

**Example prompts in agent mode**

- "Summarize the current document and append a `## Summary` section."
- "Fix all the spelling mistakes in this file."
- "Create a new file `/home/you/notes/todo.md` with a task list from the open doc."
- "Read `/home/you/ideas.md` and merge any duplicated items into this file."

> **Provider support:** agentic tool-calling uses **native function calling**
> on every provider — OpenAI, OpenRouter, Ollama, Anthropic, and Google — plus
> any Custom OpenAI-compatible endpoint. You define a tool once and it works
> everywhere. For the smoothest local experience use a capable model such as
> `qwen3:4b` or larger; very small models may need an extra nudge.

### AI Providers

Configure providers in **Settings (⚙) → AI**:

| Provider | Required fields | Notes |
|----------|----------------|-------|
| OpenAI | API Key, Model (`gpt-4o`, `gpt-4o-mini`, …) | Streaming + tools. |
| Anthropic | API Key, Model (`claude-3-5-sonnet`, `opus`, …) | Native `tool_use`. |
| Google | API Key, Model (`gemini-1.5-pro`, `flash`, …) | Native function calling. |
| Ollama | Base URL (`http://localhost:11434`), Model name | Fully local, no key. |
| OpenRouter | API Key, Model | Access many models via one key. |
| Custom | Base URL, API Key, Model, extra headers (JSON) | Any OpenAI-compatible API. |

- Set a **default provider** for quick actions and chat.
- Keys are stored in Tauri's encrypted secure store (or `localStorage` in the
  web dev build) — never plaintext on disk.
- Trigger AI from the **Quick Actions** toolbar, the **AI panel** (`Ctrl+J`),
  or right-click selected text → **Ask AI**.

### Themes

Five built-in themes ship with Marky:

1. **Midnight Hacker** (default)
2. **Cyberpunk Neon**
3. **Solarized Dark**
4. **Obsidian**
5. **Paper Light**

Cycle themes with `Ctrl+Shift+T`, or pick one + a custom accent color and font
in **Settings → Appearance**.

### Command Palette

Press `Ctrl+K` for a fuzzy command palette: open/save files, switch views,
toggle panels, cycle themes, and run AI quick actions — all from the keyboard.

### Export

- **Copy preview as HTML** — `Ctrl+Shift+C`
- **Export to HTML** — `Ctrl+E`
- **Export to PDF** — `Ctrl+Shift+E` (opens the print dialog; "Save as PDF")

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+O` | Open file |
| `Ctrl+Shift+O` | Open folder |
| `Ctrl+S` | Save |
| `Ctrl+Shift+S` | Save As |
| `Ctrl+N` | New file |
| `Ctrl+1` | Editor only |
| `Ctrl+2` | Split view |
| `Ctrl+3` | Preview only |
| `Ctrl+B` | Toggle file sidebar |
| `Ctrl+J` | Toggle AI chat panel |
| `Ctrl+K` | Command palette |
| `Ctrl+Shift+P` | AI quick actions |
| `Ctrl+Shift+T` | Cycle themes |
| `Ctrl+=` / `Ctrl+-` | Zoom in / out (editor) |
| `Ctrl+0` | Reset zoom |
| `F11` | Fullscreen |
| `Ctrl+Shift+C` | Copy preview as HTML |
| `Ctrl+E` | Export to HTML |
| `Ctrl+Shift+E` | Export to PDF |

---

## 🔧 Build from Source

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://www.rust-lang.org) (stable)
- **Linux:** `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf libsoup-3.0-dev libjavascriptcoregtk-4.1-dev`
- **Windows:** Visual Studio 2022 with C++ desktop + MSVC, NSIS

### Steps

```bash
git clone https://github.com/marky-app/marky.git
cd marky
npm install
npm run tauri build      # platform bundles in src-tauri/target/*/release/bundle/
```

Web-only dev run (no Rust toolchain needed):

```bash
npm install
npm run dev              # opens the UI in a browser (filesystem limited)
```

Keep the build green before committing:

```bash
npm run lint             # tsc --noEmit
npm run build            # tsc + vite
```

---

## 🏗️ Architecture

```
marky/
├── src/                     # React + TypeScript frontend
│   ├── components/          # Editor, Preview, Sidebar, AiPanel, TitleBar, StatusBar, …
│   ├── hooks/               # useTheme, useFiles, useAi, useSettings, usePersistence
│   ├── stores/              # Zustand: themeStore, fileStore, aiStore, settingsStore
│   ├── lib/
│   │   ├── ai-providers/    # ollama, openai-compatible, anthropic, google (tool-calling)
│   │   ├── ai-agent/        # ReAct loop + tools (read/write/edit editor & files)
│   │   ├── markdown-parser/ # Marked + DOMPurify + highlight.js + Mermaid + KaTeX
│   │   └── platform.ts      # Tauri ↔ web bridge (fs via plugin-fs)
│   ├── styles/              # themes (CSS vars) + globals
│   └── App.tsx
├── src-tauri/               # Rust backend (Tauri v2)
│   ├── src/main.rs          # window, plugins, single-instance
│   ├── Cargo.toml
│   └── tauri.conf.json
├── releases/                # prebuilt artifacts (Marky_1.0.0_amd64.deb, *_x64-setup.exe)
└── .github/workflows/       # release.yml CI/CD
```

**Agentic data flow:** the UI toggles `agentMode` in `aiStore` → `AiPanel`
calls `runAgent` → `agent.ts` sends the tool catalogue (`AGENT_TOOLS`) to the
active provider via native function calling → the provider returns structured
`tool_calls` → `executeTool` runs the action against the editor or filesystem →
the result is fed back → the loop repeats until a final answer.

---

## 📜 License

MIT — see [LICENSE](LICENSE).
