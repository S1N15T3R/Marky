import { create } from "zustand";
import type { RecentFile, ViewMode, FileNode } from "@/types";

interface FileState {
  path: string | null; // absolute path on disk (null = untitled)
  name: string;
  content: string;
  savedContent: string; // last content written to disk
  dirty: boolean;
  viewMode: ViewMode;
  recent: RecentFile[];
  folderRoot: string | null;
  tree: FileNode[];
  fontSize: number;
  zoom: number; // editor zoom percent

  setFile: (path: string, name: string, content: string) => void;
  setUntitled: (name: string, content: string) => void;
  setContent: (content: string) => void;
  setSaved: () => void;
  setViewMode: (m: ViewMode) => void;
  setRecent: (r: RecentFile[]) => void;
  setFolder: (root: string | null, tree: FileNode[]) => void;
  setZoom: (z: number) => void;
}

export const useFileStore = create<FileState>((set) => ({
  path: null,
  name: "untitled.md",
  content: "",
  savedContent: "",
  dirty: false,
  viewMode: "split",
  recent: [],
  folderRoot: null,
  tree: [],
  fontSize: 14,
  zoom: 100,

  setFile: (path, name, content) =>
    set({ path, name, content, savedContent: content, dirty: false }),
  setUntitled: (name, content) =>
    set({ path: null, name, content, savedContent: content, dirty: false }),
  setContent: (content) =>
    set((s) => ({ content, dirty: content !== s.savedContent })),
  setSaved: () => set((s) => ({ savedContent: s.content, dirty: false })),
  setViewMode: (viewMode) => set({ viewMode }),
  setRecent: (recent) => set({ recent }),
  setFolder: (folderRoot, tree) => set({ folderRoot, tree }),
  setZoom: (zoom) => set({ zoom }),
}));
