import { ensureOk, readSSE, type ProviderRequest, type StreamFn } from "./transport";

// OpenAI-compatible streaming (OpenAI, OpenRouter, Ollama, Custom).
// All use POST {baseUrl}/chat/completions with SSE deltas.
export const openAICompatibleStream: StreamFn = async function* (req) {
  const url = req.baseUrl.replace(/\/$/, "") + "/chat/completions";
  const body: any = {
    model: req.model,
    messages: req.messages,
    stream: true,
    temperature: req.opts.temperature ?? 0.7,
  };
  if (req.opts.maxTokens) body.max_tokens = req.opts.maxTokens;
  if (req.opts.system) body.messages = [{ role: "system", content: req.opts.system }, ...req.messages];

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${req.apiKey}`,
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
      const delta = json.choices?.[0]?.delta?.content;
      if (delta) yield delta;
      const usage = json.usage?.total_tokens ?? json.usage?.totalTokens;
      if (typeof usage === "number") req.meta.usage = usage;
    } catch {
      /* ignore malformed keepalive lines */
    }
  }
};
