// CRITICAL
"use client";

/**
 * Context Management Hooks
 */

import { useCallback } from "react";
import { getContextManagementService } from "./factory";
import type {
  ContextMessage,
  CompactionStrategy,
  UtilizationLevel,
} from "./types";

/**
 * Main hook for context management operations
 */
export function useContextManagement() {
  const service = getContextManagementService();
  const config = service.config;

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
