"use client";

import { useCallback } from "react";
import { api } from "@/lib/api";
import type { SessionUsage } from "@/lib/types";

interface UseChatUsageOptions {
  setSessionUsage: (usage: SessionUsage | null) => void;
}

export function useChatUsage({ setSessionUsage }: UseChatUsageOptions) {
  const refreshUsage = useCallback(
    async (sessionId: string) => {
      try {
        const usage = await api.getChatUsage(sessionId);
        setSessionUsage({
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          estimated_cost: usage.estimated_cost_usd,
        });
      } catch (err) {
        console.error("Failed to refresh usage:", err);
      }
    },
    [setSessionUsage],
  );

  return {
    refreshUsage,
  };
}
