import { useCallback } from "react";
import { useAiStore } from "@/stores/aiStore";
import { getActiveProvider, streamToConversation, cancelStream } from "@/lib/ai-engine";

// Thin React hook around the hooks-free AI engine. The engine itself can be
// called from non-component contexts (toolbar, context menu, command palette).
export function useAi() {
  const busy = useAiStore((s) => s.busy);
  const abort = useAiStore((s) => s.abort);

  const runStream = useCallback(
    (userText: string, opts?: { system?: string }) => streamToConversation(userText, opts),
    []
  );
  const cancel = useCallback(() => cancelStream(), []);
  const activeProvider = useCallback(() => getActiveProvider(), []);

  return { runStream, cancel, activeProvider, busy, abort };
}
