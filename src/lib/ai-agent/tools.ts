// Agentic tools for Marky's AI. Each tool has a JSON-schema-ish spec (for the
// system prompt) and an executor. Tools operate on the LIVE editor (via
// fileStore) and the workspace filesystem (via the platform bridge / Rust).
//
// The agent protocol is provider-agnostic (plain JSON in the text stream), so
// it works identically for Ollama and every cloud model without relying on
// vendor-specific function-calling APIs.
import { useFileStore } from "@/stores/fileStore";
import {
  readTextFile,
  writeTextFile,
  readDir,
  fileExists,
  runningInTauri,
} from "@/lib/platform";

export interface ToolSpec {
  name: string;
  description: string;
  params: Record<string, string>; // param -> description
}

export interface ToolResult {
  ok: boolean;
  output: string;
}

// ---- Tool catalogue (advertised to the model) ----
export const TOOL_SPECS: ToolSpec[] = [
  {
    name: "read_editor",
    description: "Read the full markdown content of the file currently open in the editor.",
    params: {},
  },
  {
    name: "write_editor",
    description:
      "Replace the ENTIRE editor content with new markdown. Use for rewrites or when creating a document from scratch.",
    params: { content: "the complete new markdown content" },
  },
  {
    name: "edit_editor",
    description:
      "Replace the first exact occurrence of `find` with `replace` in the editor. Prefer this for small, targeted edits. `find` must match exactly (including whitespace).",
    params: { find: "exact text to locate", replace: "text to substitute in" },
  },
  {
    name: "read_file",
    description: "Read a UTF-8 text file from disk by absolute path.",
    params: { path: "absolute file path" },
  },
  {
    name: "write_file",
    description:
      "Write (create or overwrite) a UTF-8 text file on disk. Parent dir must exist.",
    params: { path: "absolute file path", content: "file content" },
  },
  {
    name: "list_dir",
    description: "List files and folders under a directory (recursive, shallow depth).",
    params: { path: "absolute directory path" },
  },
  {
    name: "file_exists",
    description: "Check whether a path exists on disk. Returns true/false.",
    params: { path: "absolute path" },
  },
];

// ---- Executors ----
type Args = Record<string, any>;

export async function executeTool(name: string, args: Args): Promise<ToolResult> {
  try {
    switch (name) {
      case "read_editor": {
        const { content, name: fname, path } = useFileStore.getState();
        return ok(`# file: ${path || fname} (unsaved buffer)\n${content}`);
      }
      case "write_editor": {
        const content = String(args.content ?? "");
        useFileStore.getState().setContent(content);
        return ok(`Editor replaced (${content.length} chars).`);
      }
      case "edit_editor": {
        const find = String(args.find ?? "");
        const replace = String(args.replace ?? "");
        if (!find) return fail("`find` is required.");
        const cur = useFileStore.getState().content;
        const idx = cur.indexOf(find);
        if (idx < 0) return fail("`find` text not found in editor. Read the editor first to copy exact text.");
        const next = cur.slice(0, idx) + replace + cur.slice(idx + find.length);
        useFileStore.getState().setContent(next);
        return ok(`Replaced 1 occurrence (${find.length}→${replace.length} chars).`);
      }
      case "read_file": {
        if (!runningInTauri) return fail("Filesystem tools require the desktop app.");
        const path = String(args.path ?? "");
        if (!path) return fail("`path` is required.");
        const text = await readTextFile(path);
        return ok(text.length > 8000 ? text.slice(0, 8000) + "\n…[truncated]" : text);
      }
      case "write_file": {
        if (!runningInTauri) return fail("Filesystem tools require the desktop app.");
        const path = String(args.path ?? "");
        if (!path) return fail("`path` is required.");
        await writeTextFile(path, String(args.content ?? ""));
        return ok(`Wrote ${path}.`);
      }
      case "list_dir": {
        if (!runningInTauri) return fail("Filesystem tools require the desktop app.");
        const path = String(args.path ?? "");
        if (!path) return fail("`path` is required.");
        const nodes = await readDir(path, 2);
        const lines = flattenNodes(nodes).slice(0, 200);
        return ok(lines.join("\n") || "(empty)");
      }
      case "file_exists": {
        if (!runningInTauri) return fail("Filesystem tools require the desktop app.");
        const path = String(args.path ?? "");
        const exists = await fileExists(path);
        return ok(String(exists));
      }
      default:
        return fail(`Unknown tool: ${name}`);
    }
  } catch (e: any) {
    return fail(e?.message || String(e));
  }
}

function flattenNodes(nodes: any[], prefix = ""): string[] {
  const out: string[] = [];
  for (const n of nodes || []) {
    out.push(`${prefix}${n.isDir ? "📁" : "📄"} ${n.path}`);
    if (n.children?.length) out.push(...flattenNodes(n.children, prefix + "  "));
  }
  return out;
}

const ok = (output: string): ToolResult => ({ ok: true, output });
const fail = (output: string): ToolResult => ({ ok: false, output });
