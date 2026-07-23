// Provider-agnostic agentic loop for Marky. Uses NATIVE function calling:
// the tool catalogue is sent to the provider as real tools, and the model
// returns structured tool calls (not hand-written JSON). This is what makes
// the agent reliably read / edit / write files like a VS Code coding agent —
// the model doesn't have to format JSON correctly, the provider does it.
import { useAiStore } from "@/stores/aiStore";
import { getActiveProvider } from "@/lib/ai-engine";
import { handlerFor } from "@/lib/ai-providers";
import { TOOL_CALL_SENTINEL, type ToolSpec, type ToolCallPayload, type ChatMessagePayload } from "@/lib/ai-providers/transport";
import { TOOL_SPECS, executeTool } from "./tools";
import type { AIProviderConfig } from "@/types";
import { uid } from "@/lib/utils";

const MAX_STEPS = 10;

// Convert our tool catalogue into the provider ToolSpec shape.
const AGENT_TOOLS: ToolSpec[] = TOOL_SPECS.map((t) => ({
  name: t.name,
  description: t.description,
  parameters: Object.fromEntries(
    Object.entries(t.params).map(([k, v]) => [k, { type: "string", description: v }])
  ),
}));

function buildSystemPrompt(): string {
  return `You are Marky Agent, an autonomous coding/writing assistant embedded in a markdown editor. You can act on the user's files using the provided tools, like a VS Code coding agent.

How to work:
- Take ONE step at a time. Decide which tool (if any) is needed, call it, read the result, then decide the next step.
- To modify the open document, use edit_editor (targeted) or write_editor (full rewrite). ALWAYS call read_editor first so you can copy the EXACT text for "find".
- Prefer edit_editor for small changes; only use write_editor for full rewrites or new documents.
- Use read_file / write_file / list_dir / file_exists to work with files on disk.
- When the task is complete, give the user a short final answer (in markdown) summarizing what you changed. Do not call a tool if no further action is needed.
- Keep going until the task is complete; do not ask the user to do work you can do with tools.

You have these tools available; call them when needed.`;
}

interface ModelTurn {
  text: string;
  toolCalls: ToolCallPayload[];
}

async function callModel(
  provider: AIProviderConfig,
  messages: ChatMessagePayload[],
  signal: AbortSignal
): Promise<ModelTurn> {
  const handler = handlerFor(provider.type);
  const meta = { usage: undefined as number | undefined };
  let text = "";
  const toolCalls: ToolCallPayload[] = [];
  const stream = handler.stream({
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.model,
    extraHeaders: parseHeaders(provider),
    messages,
    opts: { signal, temperature: 0.2, maxTokens: 4096 },
    tools: AGENT_TOOLS,
    meta,
  });
  for await (const chunk of stream) {
    if (chunk.startsWith(TOOL_CALL_SENTINEL)) {
      try {
        const parsed = JSON.parse(chunk.slice(TOOL_CALL_SENTINEL.length)) as ToolCallPayload[];
        toolCalls.push(...parsed);
      } catch {
        /* ignore malformed sentinel */
      }
    } else {
      text += chunk;
    }
  }
  return { text, toolCalls };
}

function parseHeaders(p: AIProviderConfig): Record<string, string> | undefined {
  if (!p.headers?.trim()) return undefined;
  try {
    const o = JSON.parse(p.headers);
    if (o && typeof o === "object") return o as Record<string, string>;
  } catch {
    /* ignore */
  }
  return undefined;
}

// Runs the agent for one user turn, appending a live assistant transcript
// message that shows each tool action / result.
export async function runAgent(userText: string): Promise<void> {
  const provider = getActiveProvider();
  if (!provider) {
    alert("No AI provider enabled. Add one in Settings → AI.");
    return;
  }
  const ai = useAiStore.getState();
  const sess = ai.activeSession();
  const key = sess.id;

  ai.pushMessage({ id: uid(), role: "user", content: userText, createdAt: Date.now() });
  const assistantId = uid();
  ai.pushMessage({ id: assistantId, role: "assistant", content: "", createdAt: Date.now(), streaming: true });

  const controller = new AbortController();
  ai.setAbort(controller);
  ai.setBusy(true);

  const transcript: ChatMessagePayload[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: userText },
  ];
  let display = "";
  const render = (extra: string) => {
    display += extra;
    useAiStore.getState().updateMessage(assistantId, { content: display });
  };

  try {
    for (let step = 0; step < MAX_STEPS; step++) {
      if (controller.signal.aborted) break;
      const turn = await callModel(provider, transcript, controller.signal);

      // Record the model's reply — with any tool calls attached so providers
      // that require echoed tool_use blocks (OpenAI, Ollama, Anthropic, Google)
      // can round-trip the tool result back correctly.
      transcript.push({
        role: "assistant",
        content: turn.text || "",
        tool_calls: turn.toolCalls.length ? turn.toolCalls : undefined,
      });

      if (turn.toolCalls.length === 0) {
        // No tool requested → this is the final answer.
        const finalText = turn.text.trim();
        if (finalText) render((display ? "\n\n" : "") + finalText);
        else render((display ? "\n\n" : "") + "(done)");
        break;
      }

      // Execute each requested tool and feed results back as tool messages.
      for (const call of turn.toolCalls) {
        let parsedArgs: Record<string, any> = {};
        try {
          parsedArgs = JSON.parse(call.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        const toolName = call.function.name;
        render(`${display ? "\n\n" : ""}🔧 **${toolName}**`);
        const result = await executeTool(toolName, parsedArgs);
        const clipped = result.output.length > 4000 ? result.output.slice(0, 4000) + "\n…[truncated]" : result.output;
        render(`\n${result.ok ? "✓" : "✗"} ${clipped.split("\n")[0].slice(0, 160)}`);

        transcript.push({
          role: "tool",
          tool_call_id: call.id,
          name: toolName,
          content: `TOOL_RESULT ${toolName} (${result.ok ? "ok" : "error"}):\n${clipped}`,
        });
      }

      if (step === MAX_STEPS - 1) {
        render(`\n\n⚠️ Reached step limit (${MAX_STEPS}). Stopping.`);
      }
    }
    useAiStore.getState().updateMessage(assistantId, { streaming: false });
  } catch (e: any) {
    if (controller.signal.aborted) {
      useAiStore.getState().updateMessage(assistantId, { streaming: false, error: false });
      return;
    }
    console.error("[Marky Agent error]", e);
    let msg = e?.message || String(e);
    if (/failed to fetch|load failed|network/i.test(msg)) {
      msg = `Cannot reach ${provider.baseUrl}. Is the provider running / key valid?`;
    } else if (e?.status) {
      msg = `Provider error ${e.status}: ${msg}`;
    }
    useAiStore.getState().updateMessage(assistantId, {
      content: display + `\n\n[error] ${msg}`,
      streaming: false,
      error: true,
    });
  } finally {
    useAiStore.getState().setBusy(false);
    useAiStore.getState().setAbort(null);
  }
}
