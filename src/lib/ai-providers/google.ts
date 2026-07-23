import { ensureOk, readSSE, aiFetch, TOOL_CALL_SENTINEL, type ProviderRequest, type StreamFn, type ToolCallPayload, type ToolSpec } from "./transport";

// Google Gemini streaming via streamGenerateContent (SSE), with native tool use.
export const googleStream: StreamFn = async function* (req) {
  const base = req.baseUrl.replace(/\/$/, "");
  const model = req.model || "gemini-1.5-pro";
  const url = `${base}/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${encodeURIComponent(req.apiKey)}`;

  // Convert cross-provider messages into Gemini's contents schema. Assistant
  // tool_calls become functionCall parts; tool results become functionResponse.
  const contents = req.messages
    .filter((m) => m.role === "user" || m.role === "assistant" || m.role === "tool")
    .map((m) => {
      if (m.role === "assistant" && m.tool_calls?.length) {
        return {
          role: "model",
          parts: m.tool_calls.map((c) => ({
            functionCall: { name: c.function.name, args: safeParse(c.function.arguments) },
          })),
        };
      }
      if (m.role === "tool") {
        return {
          role: "user",
          parts: [
            {
              functionResponse: {
                name: m.name || "tool",
                response: { result: m.content },
              },
            },
          ],
        };
      }
      const role = m.role === "assistant" ? "model" : "user";
      return { role, parts: [{ text: m.content }] };
    });

  const body: any = { contents };
  if (req.opts.system) body.systemInstruction = { parts: [{ text: req.opts.system }] };
  if (req.opts.maxTokens) body.generationConfig = { maxOutputTokens: req.opts.maxTokens };
  if (req.tools && req.tools.length) {
    body.tools = [
      {
        functionDeclarations: req.tools.map((t: ToolSpec) => ({
          name: t.name,
          description: t.description,
          parameters: { type: "OBJECT", properties: t.parameters },
        })),
      },
    ];
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(req.extraHeaders || {}),
  };

  const res = await aiFetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
    signal: req.opts.signal,
  });
  await ensureOk(res);

  let sawToolCall = false;

  for await (const data of readSSE(res, req.opts.signal)) {
    try {
      const json = JSON.parse(data);
      const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) yield text;
      const usage = json.usageMetadata?.totalTokenCount;
      if (typeof usage === "number") req.meta.usage = usage;

      const fc = json.candidates?.[0]?.content?.parts?.find((p: any) => p.functionCall);
      if (fc?.functionCall) {
        sawToolCall = true;
        const call: ToolCallPayload = {
          id: "call_0",
          type: "function",
          function: {
            name: fc.functionCall.name,
            arguments: JSON.stringify(fc.functionCall.args ?? {}),
          },
        };
        yield TOOL_CALL_SENTINEL + JSON.stringify([call]);
      }
    } catch {
      /* ignore */
    }
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
