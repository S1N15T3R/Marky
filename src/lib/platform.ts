// Platform bridge: prefers Tauri v2 APIs, falls back to browser APIs when
// running outside Tauri (e.g. plain `vite` dev / preview). This keeps the
// app fully functional and testable in a browser while using native
// filesystem, secure store, and SQLite inside the packaged desktop app.

import { isTauri } from "@tauri-apps/api/core";

export const runningInTauri = isTauri();

// ---- Secure store (Tauri store plugin) ----
let storePromise: Promise<any> | null = null;
async function getStore() {
  if (!runningInTauri) return null;
  if (!storePromise) {
    const mod = await import("@tauri-apps/plugin-store");
    storePromise = mod.Store.load("marky.dat", { autoSave: true });
  }
  return storePromise;
}

const lsKey = (k: string) => `marky:${k}`;

export async function storeGet<T>(key: string, fallback: T): Promise<T> {
  if (runningInTauri) {
    const store = await getStore();
    const v = await store?.get(key);
    return v === undefined ? fallback : (v as T);
  }
  const raw = localStorage.getItem(lsKey(key));
  return raw ? (JSON.parse(raw) as T) : fallback;
}

export async function storeSet<T>(key: string, value: T): Promise<void> {
  if (runningInTauri) {
    const store = await getStore();
    await store?.set(key, value);
    await store?.save();
    return;
  }
  localStorage.setItem(lsKey(key), JSON.stringify(value));
}

// ---- SQLite (recent files) via Tauri sql plugin ----
let dbPromise: Promise<any> | null = null;
async function getDb() {
  if (!runningInTauri) return null;
  if (!dbPromise) {
    const { default: Database } = await import("@tauri-apps/plugin-sql");
    dbPromise = Database.load("sqlite:marky.db");
  }
  return dbPromise;
}

export async function initDb(): Promise<void> {
  if (!runningInTauri) return;
  try {
    const db = await getDb();
    await db?.execute(
      `CREATE TABLE IF NOT EXISTS recent_files (
        path TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        last_opened INTEGER NOT NULL
      )`
    );
  } catch (e) {
    console.warn("DB init failed", e);
  }
}

export async function dbAddRecent(path: string, name: string): Promise<void> {
  if (!runningInTauri) return;
  try {
    const db = await getDb();
    await db?.execute(
      `INSERT OR REPLACE INTO recent_files (path, name, last_opened) VALUES ($1, $2, $3)`,
      [path, name, Date.now()]
    );
    await db?.execute(
      `DELETE FROM recent_files WHERE path NOT IN (
         SELECT path FROM recent_files ORDER BY last_opened DESC LIMIT 30
       )`
    );
  } catch (e) {
    console.warn("dbAddRecent failed", e);
  }
}

export async function dbGetRecent(): Promise<{ path: string; name: string; last_opened: number }[]> {
  if (!runningInTauri) return [];
  try {
    const db = await getDb();
    return (await db?.select(
      `SELECT path, name, last_opened FROM recent_files ORDER BY last_opened DESC LIMIT 30`
    )) as any[];
  } catch {
    return [];
  }
}

// ---- Filesystem ----
export async function openFilePicker(): Promise<{ path: string; content: string } | null> {
  if (runningInTauri) {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const fs = await import("@tauri-apps/plugin-fs");
    const selected = await dialog.open({
      multiple: false,
      filters: [{ name: "Markdown", extensions: ["md", "markdown", "txt"] }],
    });
    if (!selected || Array.isArray(selected)) return null;
    const content = await fs.readTextFile(selected as string);
    return { path: selected as string, content };
  }
  // Browser fallback
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".md,.markdown,.txt";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      const content = await f.text();
      resolve({ path: f.name, content });
    };
    input.click();
  });
}

export async function pickFolder(): Promise<string | null> {
  if (runningInTauri) {
    const dialog = await import("@tauri-apps/plugin-dialog");
    const selected = await dialog.open({ directory: true, multiple: false });
    if (!selected || Array.isArray(selected)) return null;
    return selected as string;
  }
  return null;
}

export async function readTextFile(path: string): Promise<string> {
  if (runningInTauri) {
    const fs = await import("@tauri-apps/plugin-fs");
    return fs.readTextFile(path);
  }
  throw new Error("readTextFile not supported in browser");
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  if (runningInTauri) {
    const fs = await import("@tauri-apps/plugin-fs");
    await fs.writeTextFile(path, content);
    return;
  }
  // Browser fallback: download
  downloadText(content, path.split(/[\\/]/).pop() || "untitled.md");
}

export async function readDir(path: string, depth = 4): Promise<any[]> {
  if (runningInTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("read_dir", { path, depth });
  }
  return [];
}

export async function fileExists(path: string): Promise<boolean> {
  if (runningInTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke("file_exists", { path });
  }
  return false;
}

export async function saveAsPicker(defaultName: string): Promise<string | null> {
  if (runningInTauri) {
    const dialog = await import("@tauri-apps/plugin-dialog");
    return dialog.save({
      defaultPath: defaultName,
      filters: [{ name: "Markdown", extensions: ["md", "markdown"] }],
    });
  }
  return null;
}

// ---- Clipboard ----
export async function copyText(text: string): Promise<void> {
  if (runningInTauri) {
    try {
      const clip = await import("@tauri-apps/plugin-clipboard-manager");
      await clip.writeText(text);
      return;
    } catch {
      /* fall through */
    }
  }
  await navigator.clipboard?.writeText(text);
}

// ---- Export (download in browser, native write in Tauri) ----
export function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportFile(path: string, content: string): Promise<void> {
  if (runningInTauri) {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("export_html", { path, html: content });
    return;
  }
  const filename = path.split(/[\\/]/).pop() || "export";
  downloadText(content, filename);
}

export async function openExternal(url: string): Promise<void> {
  if (runningInTauri) {
    const opener = await import("@tauri-apps/plugin-opener");
    await opener.openUrl(url);
  } else {
    window.open(url, "_blank");
  }
}
