// CRITICAL
"use client";

/**
 * Context Management Hooks
 */

import { useContext, useCallback } from "react";
import { ContextManagementContext } from "./context";
import { DEFAULT_CONTEXT_CONFIG } from "./types";
import type {
  ContextMessage,
  CompactionStrategy,
  UtilizationLevel,
} from "./types";

/**
 * Main hook for context management operations
 */
export function useContextManagement() {
  const context = useContext(ContextManagementContext);
  const service = context?.service ?? null;
  const config = context?.config ?? DEFAULT_CONTEXT_CONFIG;
  if (!service) {
    throw new Error("useContextManagement must be used within a ContextManagementProvider");
  }

  const estimateTokens = useCallback((text: string) => service.estimateTokens(text), [service]);

  const calculateMessageTokens = useCallback(
    (messages: ContextMessage[]) => service.calculateMessageTokens(messages),
    [service],
  );

  const compactMessages = useCallback(
    (messages: ContextMessage[], maxContext: number, strategy?: CompactionStrategy) =>
      service.compactMessages(messages, maxContext, strategy),
    [service],
  );

  const getUtilizationLevel = useCallback(
    (utilization: number): UtilizationLevel => service.getUtilizationLevel(utilization),
    [service],
  );

  const formatTokenCount = useCallback(
    (tokens: number) => service.formatTokenCount(tokens),
    [service],
  );

  const calculateStats = useCallback(
    (messages: ContextMessage[], maxContext: number, systemPrompt?: string, tools?: unknown[]) =>
      service.calculateStats(messages, maxContext, systemPrompt, tools),
    [service],
  );

  return {
    service,
    config,
    estimateTokens,
    calculateMessageTokens,
    compactMessages,
    getUtilizationLevel,
    formatTokenCount,
    calculateStats,
  };
}
