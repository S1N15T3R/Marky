// Hooks-free AI streaming engine. Reads provider/settings state directly from
// Zustand stores so it can be called from anywhere (toolbar, context menu,
// command palette) without a React component. The useAi hook wraps this.
import { useSettingsStore } from "@/stores/settingsStore";
import { useAiStore } from "@/stores/aiStore";
import { handlerFor } from "@/lib/ai-providers";
import type { AIProviderConfig, ChatMessage } from "@/types";
import { uid } from "@/lib/utils";

const SYSTEM_PROMPT =
  "You are Marky, an assistant embedded in a markdown editor. Help the user write, edit, and understand markdown. Preserve markdown formatting. Be concise and direct.";

export function getActiveProvider(): AIProviderConfig | null {
  const { providers } = useAiStore.getState();
  const activeProviderId = useSettingsStore.getState().settings.activeProviderId;
  return providers.find((x) => x.id === activeProviderId && x.enabled) || providers.find((x) => x.enabled) || null;
}

// Streams a user prompt into the active chat session.
export async function streamToConversation(
  userText: string,
  opts?: { system?: string; onDone?: (text: string) => void }
): Promise<void> {
  const provider = getActiveProvider();
  if (!provider) {
    alert("No AI provider enabled. Add one in Settings → AI.");
    return;
  }
  const handler = handlerFor(provider.type);
  const ai = useAiStore.getState();
  const sess = ai.activeSession();

  ai.pushMessage({ id: uid(), role: "user", content: userText, createdAt: Date.now() });
  const assistantId = uid();
  ai.pushMessage({ id: assistantId, role: "assistant", content: "", createdAt: Date.now(), streaming: true });

  const history = sess.messages;
  const payloadMessages = history
    .filter((m) => m.id !== assistantId && m.content)
    .map((m) => ({ role: m.role, content: m.content }));

  const controller = new AbortController();
  ai.setAbort(controller);
  ai.setBusy(true);

  const meta = { usage: undefined as number | undefined };
  let acc = "";

  try {
    const stream = handler.stream({
      baseUrl: provider.baseUrl,
      apiKey: provider.apiKey,
      model: provider.model,
      extraHeaders: parseHeaders(provider),
      messages: payloadMessages,
      opts: { signal: controller.signal, system: opts?.system ?? SYSTEM_PROMPT, temperature: 0.7, maxTokens: 4096 },
      meta,
    });
    for await (const chunk of stream) {
      acc += chunk;
      useAiStore.getState().updateMessage(assistantId, { content: acc });
    }
    useAiStore.getState().updateMessage(assistantId, { streaming: false, tokens: meta.usage });
  } catch (e: any) {
    const cancelled = controller.signal.aborted;
    if (cancelled) {
      useAiStore.getState().updateMessage(assistantId, { content: acc, streaming: false, error: false });
      return;
    }
    // Diagnostics: surface the raw error so webview-specific failures
    // (CSP/mixed-content/CORS) are visible, not swallowed.
    console.error("[Marky AI raw error]", e);
    // Surface an actionable message instead of the opaque "[error] Load failed".
    let msg = e?.message || String(e);
    if (/failed to fetch|load failed|networkerror|network error/i.test(msg)) {
      const host = provider.baseUrl.replace(/\/+$/, "");
      msg = `Cannot reach ${host}.\n\nIs the provider running and reachable?\n• Ollama: 'ollama serve' (default http://127.0.0.1:11434)\n• Cloud keys: check the API key in Settings → AI`;
    } else if (e?.status) {
      msg = `Provider error ${e.status}: ${msg}`;
    }
    useAiStore.getState().updateMessage(assistantId, {
      content: acc + `\n\n[error] ${msg}`,
      streaming: false,
      error: true,
    });
  } finally {
    useAiStore.getState().setBusy(false);
    useAiStore.getState().setAbort(null);
    opts?.onDone?.(acc);
  }
}

export function cancelStream() {
  const ai = useAiStore.getState();
  ai.abort?.abort();
  ai.setBusy(false);
}

function parseHeaders(p: AIProviderConfig): Record<string, string> | undefined {
  if (!p.headers?.trim()) return undefined;
  try {
    const obj = JSON.parse(p.headers);
    if (obj && typeof obj === "object") return obj as Record<string, string>;
  } catch {
    /* ignore */
  }
  return undefined;
}

export { SYSTEM_PROMPT };
