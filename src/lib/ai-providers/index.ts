import type { AIProviderConfig } from "@/types";
import { openAICompatibleStream } from "./openai-compatible";
import { anthropicStream } from "./anthropic";
import { googleStream } from "./google";
import { ollamaStream } from "./ollama";
import type { StreamFn } from "./transport";

interface ProviderHandler {
  label: string;
  defaultBaseUrl: string;
  defaultModels: string[];
  stream: StreamFn;
  needsKey: boolean;
  // Derived base URL is fixed for hosted providers.
  fixedBase?: (model: string) => string;
}

export const PROVIDERS: Record<AIProviderConfig["type"], ProviderHandler> = {
  openai: {
    label: "OpenAI",
    defaultBaseUrl: "https://api.openai.com/v1",
    defaultModels: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-mini"],
    needsKey: true,
    stream: openAICompatibleStream,
  },
  anthropic: {
    label: "Anthropic",
    defaultBaseUrl: "https://api.anthropic.com",
    defaultModels: ["claude-3-5-sonnet-latest", "claude-3-opus-latest", "claude-3-haiku-latest"],
    needsKey: true,
    stream: anthropicStream,
  },
  google: {
    label: "Google",
    defaultBaseUrl: "https://generativelanguage.googleapis.com",
    defaultModels: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
    needsKey: true,
    stream: googleStream,
  },
  ollama: {
    label: "Ollama",
    defaultBaseUrl: "http://127.0.0.1:11434/api",
    defaultModels: ["qwen3:4b", "llama3.1", "llama3", "mistral", "qwen2.5", "deepseek-r1:1.5b"],
    needsKey: false,
    stream: ollamaStream,
  },
  openrouter: {
    label: "OpenRouter",
    defaultBaseUrl: "https://openrouter.ai/api/v1",
    defaultModels: ["openai/gpt-4o", "anthropic/claude-3.5-sonnet", "meta-llama/llama-3.1-70b-instruct"],
    needsKey: true,
    stream: openAICompatibleStream,
  },
  custom: {
    label: "Custom",
    defaultBaseUrl: "https://api.example.com/v1",
    defaultModels: ["custom-model"],
    needsKey: true,
    stream: openAICompatibleStream,
  },
};

export function handlerFor(type: AIProviderConfig["type"]): ProviderHandler {
  return PROVIDERS[type] ?? PROVIDERS.custom;
}
