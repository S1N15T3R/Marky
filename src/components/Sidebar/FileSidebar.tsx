import { useEffect, useState } from "react";
import { useFileStore } from "@/stores/fileStore";
import { readDir, readTextFile, dbAddRecent, openFilePicker } from "@/lib/platform";
import type { FileNode, RecentFile } from "@/types";
import { basename } from "@/lib/utils";
import { useThemeStore } from "@/stores/themeStore";
import { cn } from "@/lib/utils";

function FileTreeNode({
  node,
  depth,
  onOpen,
}: {
  node: FileNode;
  depth: number;
  onOpen: (n: FileNode) => void;
}) {
  const [open, setOpen] = useState(depth < 2);
  const [children, setChildren] = useState<FileNode[] | undefined>(node.children);
  const theme = useThemeStore((s) => s.theme);

  const toggle = async () => {
    if (node.isDir) {
      if (!children || children.length === 0) {
        const res = await readDir(node.path, 2);
        setChildren(res);
      }
      setOpen((o) => !o);
    } else {
      onOpen(node);
    }
  };

  const isMd = /\.(md|markdown)$/i.test(node.name);

  return (
    <div>
      <div
        className={cn(
          "flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 text-xs hover:bg-surface-2",
          isMd ? "text-text" : "text-text-muted"
        )}
        style={{ paddingLeft: depth * 12 + 4 }}
        onClick={toggle}
      >
        <span className="w-3 text-center">{node.isDir ? (open ? "▾" : "▸") : ""}</span>
        <span>{node.isDir ? "📁" : isMd ? "📄" : "·"}</span>
        <span className="truncate">{node.name}</span>
      </div>
      {node.isDir && open && children && (
        <div>
          {children.map((c) => (
            <FileTreeNode key={c.path} node={c} depth={depth + 1} onOpen={onOpen} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FileSidebar() {
  const tree = useFileStore((s) => s.tree);
  const folderRoot = useFileStore((s) => s.folderRoot);
  const setFile = useFileStore((s) => s.setFile);
  const setRecent = useFileStore((s) => s.setRecent);
  const recent = useFileStore((s) => s.recent);

  const openFile = async (n: FileNode) => {
    try {
      const content = await readTextFile(n.path);
      setFile(n.path, basename(n.path), content);
      await dbAddRecent(n.path, basename(n.path));
      const updated: RecentFile[] = [
        { path: n.path, name: basename(n.path), lastOpened: Date.now() },
        ...recent.filter((r) => r.path !== n.path).slice(0, 29),
      ];
      setRecent(updated);
    } catch (e) {
      console.warn("open failed", e);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-[11px] uppercase tracking-wider text-text-muted">Files</span>
        {folderRoot && <span className="truncate text-[10px] text-text-muted" title={folderRoot}>{basename(folderRoot)}</span>}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {tree.length === 0 ? (
          <div className="px-2 py-4 text-xs text-text-muted">No folder open. Use Ctrl+Shift+O to open a folder.</div>
        ) : (
          tree.map((n) => <FileTreeNode key={n.path} node={n} depth={0} onOpen={openFile} />)
        )}
      </div>
      {recent.length > 0 && (
        <div className="border-t border-border p-2">
          <div className="mb-1 px-1 text-[11px] uppercase tracking-wider text-text-muted">Recent</div>
          <div className="max-h-40 overflow-y-auto">
            {recent.map((r) => (
              <div
                key={r.path}
                className="cursor-pointer truncate rounded px-2 py-0.5 text-xs text-text-muted hover:bg-surface-2 hover:text-text"
                title={r.path}
                onClick={() => openFile({ name: r.name, path: r.path, isDir: false })}
              >
                {r.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
