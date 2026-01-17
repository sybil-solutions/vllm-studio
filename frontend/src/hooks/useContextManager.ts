'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  useContextManagement,
  type ContextConfig,
  type ContextStats,
  type CompactionEvent,
  type CompactionStrategy,
  type ContextMessage,
  DEFAULT_CONTEXT_CONFIG,
} from '@/lib/services/context-management';

type Message = ContextMessage;

interface UseContextManagerProps {
  /** Current chat messages */
  messages: Message[];
  /** Maximum context length from model/recipe */
  maxContext: number;
  /** System prompt if any */
  systemPrompt?: string;
  /** MCP tools if enabled */
  tools?: unknown[];
  /** Callback when compaction occurs */
  onCompact?: (newMessages: Message[], event: CompactionEvent) => void;
  /** Configuration overrides */
  config?: Partial<ContextConfig>;
  /** Enable/disable the manager */
  enabled?: boolean;
}

interface UseContextManagerReturn {
  stats: ContextStats;
  config: ContextConfig;
  isWarning: boolean;
  isCritical: boolean;
  canSendMessage: boolean;
  utilizationLevel: 'low' | 'medium' | 'high' | 'critical';
  compact: (strategy?: CompactionStrategy) => void;
  updateConfig: (updates: Partial<ContextConfig>) => void;
  refreshStats: () => void;
}

const STORAGE_KEY = 'vllm_context_config';
const HISTORY_KEY = 'vllm_compaction_history';

function loadConfig(): ContextConfig {
  if (typeof window === 'undefined') return DEFAULT_CONTEXT_CONFIG;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_CONTEXT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // Ignore
  }
  return DEFAULT_CONTEXT_CONFIG;
}

function saveConfig(config: ContextConfig): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {
    // Ignore
  }
}

function loadHistory(): CompactionEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Convert date strings back to Date objects
      return parsed.map((e: CompactionEvent) => ({
        ...e,
        timestamp: new Date(e.timestamp),
      }));
    }
  } catch {
    // Ignore
  }
  return [];
}

function saveHistory(history: CompactionEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    // Keep only last 50 events
    const trimmed = history.slice(-50);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore
  }
}

export function useContextManager({
  messages,
  maxContext,
  systemPrompt,
  tools,
  onCompact,
  config: configOverrides,
  enabled = true,
}: UseContextManagerProps): UseContextManagerReturn {
  const [config, setConfig] = useState<ContextConfig>(() => ({
    ...loadConfig(),
    ...configOverrides,
  }));
  const [compactionHistory, setCompactionHistory] = useState<CompactionEvent[]>(loadHistory);
  const lastAutoCompactRef = useRef<number>(0);

  // Use the context management service
  const {
    calculateStats,
    getUtilizationLevel,
    compactMessages: serviceCompactMessages,
  } = useContextManagement();

  // Calculate stats
  const stats = useMemo((): ContextStats => {
    const baseStats = calculateStats(messages, maxContext, systemPrompt, tools);

    const totalCompactions = compactionHistory.length;
    const totalTokensCompacted = compactionHistory.reduce(
      (sum, e) => sum + (e.beforeTokens - e.afterTokens),
      0
    );
    const lastCompaction = compactionHistory.length > 0
      ? compactionHistory[compactionHistory.length - 1].timestamp
      : undefined;

    return {
      ...baseStats,
      compactionHistory,
      lastCompaction,
      totalCompactions,
      totalTokensCompacted,
    };
  }, [messages, maxContext, systemPrompt, tools, compactionHistory, calculateStats]);

  const utilizationLevel = getUtilizationLevel(stats.utilization);
  const isWarning = stats.utilization >= 0.75;
  const isCritical = stats.utilization >= 0.9;
  const canSendMessage = stats.utilization < 0.95;

  // Manual compact function
  const compact = useCallback((strategy: CompactionStrategy = 'sliding_window') => {
    if (messages.length <= config.preserveRecentMessages) {
      return; // Nothing to compact
    }

    const { messages: newMessages, event } = serviceCompactMessages(
      messages,
      maxContext,
      strategy
    );

    if (event.messagesRemoved > 0) {
      setCompactionHistory(prev => {
        const updated = [...prev, event];
        saveHistory(updated);
        return updated;
      });

      onCompact?.(newMessages, event);
    }
  }, [messages, maxContext, config.preserveRecentMessages, onCompact, serviceCompactMessages]);

  // Auto-compact check
  useEffect(() => {
    if (!enabled || !config.autoCompact) return;

    const checkAndCompact = () => {
      const now = Date.now();
      // Debounce: don't compact more than once per 10 seconds
      if (now - lastAutoCompactRef.current < 10000) return;

      if (stats.utilization >= config.compactionThreshold) {
        lastAutoCompactRef.current = now;
        compact('sliding_window');
      }
    };

    const interval = setInterval(checkAndCompact, config.checkInterval);

    // Also check immediately when utilization changes significantly
    if (stats.utilization >= config.compactionThreshold) {
      checkAndCompact();
    }

    return () => clearInterval(interval);
  }, [enabled, config, stats.utilization, compact]);

  // Update config
  const updateConfig = useCallback((updates: Partial<ContextConfig>) => {
    setConfig(prev => {
      const updated = { ...prev, ...updates };
      saveConfig(updated);
      return updated;
    });
  }, []);

  // Refresh stats (force recalculation)
  const refreshStats = useCallback(() => {
    // Stats are recalculated via useMemo when dependencies change
    // This is a no-op but provided for API consistency
  }, []);

  return {
    stats,
    config,
    isWarning,
    isCritical,
    canSendMessage,
    utilizationLevel,
    compact,
    updateConfig,
    refreshStats,
  };
}

export default useContextManager;
