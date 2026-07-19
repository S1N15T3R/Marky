import { ensureOk, readSSE, type ProviderRequest, type StreamFn } from "./transport";

// Google Gemini streaming via streamGenerateContent (SSE).
export const googleStream: StreamFn = async function* (req) {
  const base = req.baseUrl.replace(/\/$/, "");
  const model = req.model || "gemini-1.5-pro";
  const url = `${base}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(req.apiKey)}`;
  const contents = req.messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
  const body: any = { contents };
  if (req.opts.system) {
    body.systemInstruction = { parts: [{ text: req.opts.system }] };
  }
  if (req.opts.maxTokens) body.generationConfig = { maxOutputTokens: req.opts.maxTokens };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
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
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) yield text;
      const usage = json.usageMetadata?.totalTokenCount;
      if (typeof usage === "number") req.meta.usage = usage;
    } catch {
      /* ignore */
    }
  }
};
