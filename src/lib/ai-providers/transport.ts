// Shared transport helpers for AI providers.
// We use the webview's native fetch (works for https in Tauri v2).

export interface ChatMessagePayload {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamOptions {
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
  system?: string;
}

export interface ProviderRequest {
  baseUrl: string;
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
  messages: ChatMessagePayload[];
  opts: StreamOptions;
  // Providers write token usage here when available.
  meta: { usage?: number };
}

export type StreamFn = (req: ProviderRequest) => AsyncGenerator<string>;

// Reads an SSE response body and yields the JSON string of each `data:` line
// (skipping the [DONE] sentinel).
export async function* readSSE(
  res: Response,
  signal?: AbortSignal
): AsyncGenerator<string> {
  if (!res.body) throw new Error(`Empty response (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    if (signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      yield data;
    }
  }
}

export async function ensureOk(res: Response) {
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const t = await res.text();
      detail = t.slice(0, 300);
    } catch {
      /* ignore */
    }
    throw new Error(`Provider error ${res.status}: ${detail}`);
  }
}
