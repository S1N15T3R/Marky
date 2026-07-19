import { ensureOk, readSSE, type ProviderRequest, type StreamFn } from "./transport";

// Anthropic Claude streaming via the Messages API.
export const anthropicStream: StreamFn = async function* (req) {
  const url = req.baseUrl.replace(/\/$/, "") + "/v1/messages";
  const messages = req.messages
    .filter((m) => m.role !== "system")
    .map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
  const body: any = {
    model: req.model,
    max_tokens: req.opts.maxTokens ?? 4096,
    stream: true,
    messages,
  };
  if (req.opts.system) body.system = req.opts.system;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": req.apiKey,
    "anthropic-version": "2023-06-01",
    ...(req.extraHeaders || {}),
  };

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: req.opts.signal,
  });
  await ensureOk(res);

  for await (const data of readSSE(res, req.opts.signal)) {
    try {
      const json = JSON.parse(data);
      if (json.type === "content_block_delta" && json.delta?.text) {
        yield json.delta.text;
      } else if (json.type === "message_delta" && json.usage?.output_tokens) {
        req.meta.usage = json.usage.input_tokens + json.usage.output_tokens;
      }
    } catch {
      /* ignore */
    }
  }
};
