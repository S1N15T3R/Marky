import type { AIProviderConfig } from "@/types";
import { PROVIDERS } from "./index";

// Sensible default providers so the app is usable out of the box.
export function defaultProviders(): AIProviderConfig[] {
  const mk = (
    type: AIProviderConfig["type"],
    name: string,
    model: string,
    enabled = false,
    isDefault = false
  ): AIProviderConfig => ({
    id: `prov-${type}`,
    type,
    name,
    apiKey: "",
    baseUrl: PROVIDERS[type].defaultBaseUrl,
    model,
    headers: "",
    enabled,
    isDefault,
  });

  return [
    mk("openai", "OpenAI", "gpt-4o-mini", false),
    mk("anthropic", "Anthropic", "claude-3-5-sonnet-latest", false),
    mk("google", "Google", "gemini-1.5-flash", false),
    mk("ollama", "Ollama", "qwen3:4b", true, true),
    mk("openrouter", "OpenRouter", "openai/gpt-4o", false),
    mk("custom", "Custom", "custom-model", false),
  ];
}
