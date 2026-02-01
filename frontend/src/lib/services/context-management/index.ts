/**
 * Context Management Service Module
 *
 * Handles token estimation, context tracking, and automatic compaction
 * to prevent model context overflow.
 *
 * @example
 * ```tsx
 * // Use the hook in components
 * function ChatComponent() {
 *   const { calculateStats, compactMessages, formatTokenCount } = useContextManagement();
 *
 *   const stats = calculateStats(messages, maxContext, systemPrompt, tools);
 *   // Check stats.utilization, display formatTokenCount(stats.currentTokens)
 * }
 * ```
 */

// Types
export type {
  ContextConfig,
  CompactionStrategy,
  CompactionEvent,
  CompactionResult,
  ContextStats,
  UtilizationLevel,
  ContextMessage,
  IContextManagementService,
} from "./types";

export { DEFAULT_CONTEXT_CONFIG } from "./types";

// Service
export { ContextManagementService } from "./service";

// Factory
export { createContextManagementService, getContextManagementService } from "./factory";

// Hooks
export { useContextManagement } from "./hooks";
