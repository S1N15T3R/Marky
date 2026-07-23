import { ensureOk, aiFetch, TOOL_CALL_SENTINEL, type ProviderRequest, type StreamFn, type ToolCallPayload } from "./transport";

// Native Ollama streaming via POST {baseUrl}/chat.
// Ollama returns newline-delimited JSON objects (one per token), NOT SSE
// `data:` frames, so we parse each line directly.
export const ollamaStream: StreamFn = async function* (req) {
  // Ollama binds to IPv4 127.0.0.1 by default. The webview often resolves
  // `localhost` to IPv6 [::1], which Ollama does not listen on, causing a
  // "Load failed". Normalize to 127.0.0.1 so any saved config keeps working.
  const baseUrl = req.baseUrl.replace(/\/\/localhost\b/i, "//127.0.0.1");
  const url = baseUrl.replace(/\/$/, "") + "/chat";
  // Convert our cross-provider messages into Ollama's native chat schema,
  // including echoed tool_use blocks and tool results for round-trips.
  const ollamaMessages = req.messages.map((m) => {
    if (m.role === "assistant" && m.tool_calls?.length) {
      return {
        role: "assistant",
        content: m.content || "",
        tool_calls: m.tool_calls.map((c) => ({
          function: { name: c.function.name, arguments: c.function.arguments },
        })),
      };
    }
    if (m.role === "tool") {
      return { role: "tool", name: m.name || "tool", content: m.content };
    }
    return { role: m.role, content: m.content };
  });
  const body: any = {
    model: req.model,
    messages: ollamaMessages,
    stream: true,
  };
  if (req.opts.system) {
    body.messages = [{ role: "system", content: req.opts.system }, ...req.messages];
  }
  // Forward native function-calling tools when the agent provides them.
  if (req.tools && req.tools.length) {
    body.tools = req.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: { type: "object", properties: t.parameters, required: Object.keys(t.parameters) } },
    }));
  }

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  // Ollama doesn't require auth; only send a key if one was configured.
  if (req.apiKey && req.apiKey.trim()) {
    headers["Authorization"] = `Bearer ${req.apiKey}`;
  }
  Object.assign(headers, req.extraHeaders || {});

  const res = await aiFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: req.opts.signal,
  });
  await ensureOk(res);

  if (!res.body) throw new Error(`Empty response (${res.status})`);
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Ollama streams tool calls as partial JSON fragments. We accumulate them
  // per `index` and emit a single TOOL_CALLS sentinel once the stream ends.
  const toolFragments: Record<number, { name?: string; args: string }> = {};
  let sawToolCall = false;

  while (true) {
    if (req.opts.signal?.aborted) break;
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      try {
        const json = JSON.parse(line);
        const content = json.message?.content;
        if (content) yield content;
        const usage = json.prompt_eval_count ?? json.eval_count;
        if (typeof usage === "number") req.meta.usage = usage;

        const calls = json.message?.tool_calls;
        if (Array.isArray(calls) && calls.length) {
          sawToolCall = true;
          for (const c of calls) {
            const i = c.index ?? 0;
            const fn = c.function || {};
            toolFragments[i] = toolFragments[i] || { args: "" };
            if (typeof fn.name === "string") toolFragments[i].name = fn.name;
            if (typeof fn.arguments === "string") toolFragments[i].args += fn.arguments;
            else if (fn.arguments && typeof fn.arguments === "object") toolFragments[i].args += JSON.stringify(fn.arguments);
          }
        }
      } catch {
        /* ignore partial/keepalive lines */
      }
    }
  }

  // Emit the accumulated tool calls as a single sentinel.
  if (sawToolCall) {
    const calls: ToolCallPayload[] = Object.values(toolFragments).map((f, i) => ({
      id: `call_${i}`,
      type: "function",
      function: { name: f.name || "unknown", arguments: f.args || "{}" },
    }));
    yield TOOL_CALL_SENTINEL + JSON.stringify(calls);
  }
};
