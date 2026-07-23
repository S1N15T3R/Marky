import { ensureOk, readSSE, aiFetch, TOOL_CALL_SENTINEL, type ProviderRequest, type StreamFn, type ToolCallPayload, type ToolSpec } from "./transport";

// Anthropic Claude streaming via the Messages API, with native tool use.
export const anthropicStream: StreamFn = async function* (req) {
  const url = req.baseUrl.replace(/\/$/, "") + "/v1/messages";

  // Convert cross-provider messages into Anthropic's content-block schema.
  const messages = req.messages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "tool")
    .map((m) => {
      if (m.role === "assistant" && m.tool_calls?.length) {
        return {
          role: "assistant",
          content: m.tool_calls.map((c) => ({
            type: "tool_use",
            id: c.id || "call_0",
            name: c.function.name,
            input: safeParse(c.function.arguments),
          })),
        };
      }
      if (m.role === "tool") {
        return {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: m.tool_call_id || "call_0",
              content: m.content,
            },
          ],
        };
      }
      return { role: m.role === "assistant" ? "assistant" : "user", content: m.content };
    });

  const body: any = {
    model: req.model,
    max_tokens: req.opts.maxTokens ?? 4096,
    stream: true,
    messages,
  };
  if (req.opts.system) body.system = req.opts.system;
  if (req.tools && req.tools.length) {
    body.tools = req.tools.map((t: ToolSpec) => ({
      name: t.name,
      description: t.description,
      input_schema: { type: "object", properties: t.parameters },
    }));
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": req.apiKey,
    "anthropic-version": "2023-06-01",
    ...(req.extraHeaders || {}),
  };

  const res = await aiFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: req.opts.signal,
  });
  await ensureOk(res);

  // Accumulate streamed tool_use blocks (start event + incremental JSON).
  const toolFrags: Record<string, { name?: string; args: string }> = {};
  let sawToolCall = false;

  for await (const data of readSSE(res, req.opts.signal)) {
    try {
      const json = JSON.parse(data);
      if (json.type === "content_block_start" && json.content_block?.type === "tool_use") {
        const id = json.content_block.id || "call_0";
        toolFrags[id] = { name: json.content_block.name, args: "" };
        sawToolCall = true;
      } else if (json.type === "content_block_delta") {
        const d = json.delta;
        if (d?.type === "text" && d.text) yield d.text;
        if (d?.type === "input_json_delta" && d.partial_json) {
          const id = json.content_block?.id || Object.keys(toolFrags)[0] || "call_0";
          if (!toolFrags[id]) toolFrags[id] = { args: "" };
          toolFrags[id].args += d.partial_json;
          sawToolCall = true;
        }
      } else if (json.type === "message_delta" && json.usage?.output_tokens) {
        req.meta.usage = json.usage.input_tokens + json.usage.output_tokens;
      }
    } catch {
      /* ignore */
    }
  }

  if (sawToolCall) {
    const calls: ToolCallPayload[] = Object.entries(toolFrags).map(([id, f], i) => ({
      id: id || `call_${i}`,
      type: "function",
      function: { name: f.name || "unknown", arguments: f.args || "{}" },
    }));
    yield TOOL_CALL_SENTINEL + JSON.stringify(calls);
  }
};

function safeParse(s: string): any {
  if (!s) return {};
  try {
    return JSON.parse(s);
  } catch {
    return {};
  }
}
