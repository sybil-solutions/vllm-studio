"use client";

import { useAppStore } from "@/store";

export function resolveAgentFilesSessionId({
  currentSessionId,
  sessionIdOverride,
}: {
  currentSessionId: string | null;
  sessionIdOverride?: string | null;
}) {
  const freshSessionId = useAppStore.getState().currentSessionId;
  return sessionIdOverride || freshSessionId || currentSessionId;
}

