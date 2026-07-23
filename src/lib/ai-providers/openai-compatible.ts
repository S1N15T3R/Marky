import { ensureOk, readSSE, aiFetch, TOOL_CALL_SENTINEL, type ProviderRequest, type StreamFn, type ToolCallPayload } from "./transport";

// OpenAI-compatible streaming (OpenAI, OpenRouter, Ollama, Custom).
// All use POST {baseUrl}/chat/completions with SSE deltas.
export const openAICompatibleStream: StreamFn = async function* (req) {
  const url = req.baseUrl.replace(/\/$/, "") + "/chat/completions";
  // Map cross-provider messages to OpenAI's schema (echoed tool_calls on
  // assistant turns, and `tool` role messages for results).
  const oaMessages = req.messages.map((m) => {
    if (m.role === "assistant" && m.tool_calls?.length) {
      return {
        role: "assistant",
        content: m.content || null,
        tool_calls: m.tool_calls.map((c, i) => ({
          id: c.id || `call_${i}`,
          type: "function",
          function: { name: c.function.name, arguments: c.function.arguments },
        })),
      };
    }
    if (m.role === "tool") {
      return { role: "tool", tool_call_id: m.tool_call_id || "call_0", content: m.content };
    }
    return { role: m.role, content: m.content };
  });
  const body: any = {
    model: req.model,
    messages: oaMessages,
    stream: true,
    temperature: req.opts.temperature ?? 0.7,
  };
  if (req.opts.maxTokens) body.max_tokens = req.opts.maxTokens;
  if (req.opts.system) body.messages = [{ role: "system", content: req.opts.system }, ...req.messages];
  // Forward native function-calling tools when the agent provides them.
  if (req.tools && req.tools.length) {
    body.tools = req.tools.map((t) => ({
      type: "function",
      function: { name: t.name, description: t.description, parameters: { type: "object", properties: t.parameters, required: Object.keys(t.parameters) } },
    }));
    body.tool_choice = "auto";
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${req.apiKey}`,
    ...(req.extraHeaders || {}),
  };

  const res = await aiFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: req.opts.signal,
  });
  await ensureOk(res);

  // OpenAI streams tool calls as indexed delta fragments; accumulate them.
  const toolFragments: Record<number, { name?: string; args: string }> = {};
  let sawToolCall = false;

  for await (const data of readSSE(res, req.opts.signal)) {
    try {
      const json = JSON.parse(data);
      const delta = json.choices?.[0]?.delta;
      if (delta?.content) yield delta.content;
      const usage = json.usage?.total_tokens ?? json.usage?.totalTokens;
      if (typeof usage === "number") req.meta.usage = usage;

      const tc = delta?.tool_calls;
      if (Array.isArray(tc) && tc.length) {
        sawToolCall = true;
        for (const c of tc) {
          const i = c.index ?? 0;
          const fn = c.function || {};
          toolFragments[i] = toolFragments[i] || { args: "" };
          if (typeof fn.name === "string") toolFragments[i].name = fn.name;
          if (typeof fn.arguments === "string") toolFragments[i].args += fn.arguments;
        }
      }
    } catch {
      /* ignore malformed keepalive lines */
    }
  }

  if (sawToolCall) {
    const calls: ToolCallPayload[] = Object.values(toolFragments).map((f, i) => ({
      id: `call_${i}`,
      type: "function",
      function: { name: f.name || "unknown", arguments: f.args || "{}" },
    }));
    yield TOOL_CALL_SENTINEL + JSON.stringify(calls);
  }
};
