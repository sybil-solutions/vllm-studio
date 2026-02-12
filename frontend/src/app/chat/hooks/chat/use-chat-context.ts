// CRITICAL
"use client";

import { useCallback, useMemo } from "react";
import { safeJsonStringify } from "@/lib/safe-json";
import type { ChatMessage, ChatMessagePart } from "@/lib/types";
import { useContextManagement } from "@/lib/services/context-management";
import { useMessageParsing } from "@/lib/services/message-parsing";
import { stripThinkingForModelContext } from "../../utils";

type AvailableModel = { id: string; maxModelLen?: number };

type ContextBreakdown = {
  messages: number;
  userMessages: number;
  assistantMessages: number;
  toolCalls: number;
  userTokens: number;
  assistantTokens: number;
  thinkingTokens: number;
};

type ContextStats = ReturnType<ReturnType<typeof useContextManagement>["calculateStats"]>;

type UseChatContextArgs = {
  messages: ChatMessage[];
  selectedModel: string;
  availableModels: AvailableModel[];
  effectiveSystemPrompt: string;
  contextPanelVisible: boolean;
  getToolDefinitions: (() => unknown[]) | null;
  isToolPart: (part: ChatMessagePart) => boolean;
};

export function useChatContext(args: UseChatContextArgs): {
  maxContext: number | undefined;
  contextMessages: Array<{ role: "user" | "assistant" | "system"; content: string }>;
  contextStats: ContextStats | null;
  contextUsageLabel: string | null;
  contextBreakdown: ContextBreakdown | null;
  buildContextContent: (message: ChatMessage) => string;
  formatTokenCount: ReturnType<typeof useContextManagement>["formatTokenCount"];
  calculateMessageTokens: ReturnType<typeof useContextManagement>["calculateMessageTokens"];
  estimateTokens: ReturnType<typeof useContextManagement>["estimateTokens"];
  contextConfig: ReturnType<typeof useContextManagement>["config"];
  calculateStats: ReturnType<typeof useContextManagement>["calculateStats"];
} {
  const { messages, selectedModel, availableModels, effectiveSystemPrompt, contextPanelVisible, getToolDefinitions, isToolPart } =
    args;

  const {
    calculateStats,
    formatTokenCount,
    calculateMessageTokens,
    estimateTokens,
    config: contextConfig,
  } = useContextManagement();
  const { parseThinking } = useMessageParsing();

  const selectedModelMeta = useMemo(
    () => availableModels.find((model) => model.id === selectedModel),
    [availableModels, selectedModel],
  );

  const maxContext = selectedModel ? (selectedModelMeta?.maxModelLen ?? 32768) : undefined;

  const toolDefinitions = useMemo(() => getToolDefinitions?.() ?? [], [getToolDefinitions]);

  const buildContextContent = useCallback(
    (message: ChatMessage): string => {
      let textContent = "";
      let toolContent = "";

      for (const part of message.parts) {
        if (part.type === "text") {
          const text = (part as { text?: unknown }).text;
          if (typeof text === "string" && text) textContent += text;
          continue;
        }

        if (!isToolPart(part)) continue;

        const record = part as Record<string, unknown>;
        const input = record["input"] != null ? safeJsonStringify(record["input"], "") : "";
        const output = record["output"] != null ? safeJsonStringify(record["output"], "") : "";
        const errorText = typeof record["errorText"] === "string" ? record["errorText"] : "";

        let chunk = "";
        if (input) chunk += input;
        if (output) chunk += (chunk ? "\n" : "") + output;
        if (errorText) chunk += (chunk ? "\n" : "") + errorText;
        if (!chunk) continue;

        toolContent += (toolContent ? "\n" : "") + chunk;
      }

      const cleanedText = stripThinkingForModelContext(textContent);
      if (!cleanedText && !toolContent) return "";
      if (!toolContent) return cleanedText;
      if (!cleanedText) return toolContent;
      return `${cleanedText}\n${toolContent}`;
    },
    [isToolPart],
  );

  const contextMessages = useMemo(() => {
    return messages
      .map((message) => ({
        role: message.role,
        content: buildContextContent(message),
      }))
      .filter((message) => message.content.trim().length > 0);
  }, [buildContextContent, messages]);

  const contextStats = useMemo(() => {
    if (!maxContext) return null;
    return calculateStats(contextMessages, maxContext, effectiveSystemPrompt, toolDefinitions);
  }, [contextMessages, maxContext, effectiveSystemPrompt, calculateStats, toolDefinitions]);

  const contextUsageLabel = useMemo(() => {
    if (!contextStats) return null;
    return `${formatTokenCount(contextStats.currentTokens)} / ${formatTokenCount(contextStats.maxContext)}`;
  }, [contextStats, formatTokenCount]);

  const contextBreakdown = useMemo<ContextBreakdown | null>(() => {
    if (!contextStats || !contextPanelVisible) return null;

    let userTokens = 0;
    let assistantTokens = 0;
    let thinkingTokens = 0;
    let userMessages = 0;
    let assistantMessages = 0;
    let toolCalls = 0;

    messages.forEach((message) => {
      let textContent = "";
      for (const part of message.parts) {
        if (part.type !== "text") continue;
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text) textContent += text;
      }

      const cleaned = stripThinkingForModelContext(textContent);
      const tokens = estimateTokens(cleaned);

      if (message.role === "user") {
        userMessages += 1;
        userTokens += tokens;
      } else {
        assistantMessages += 1;
        assistantTokens += tokens;
      }

      const lower = textContent.toLowerCase();
      const hasThinkTags = lower.includes("<think") || lower.includes("<thinking");
      if (hasThinkTags) {
        const thinking = parseThinking(textContent).thinkingContent;
        if (thinking) thinkingTokens += estimateTokens(thinking);
      }

      for (const part of message.parts) {
        if (part.type === "dynamic-tool") toolCalls += 1;
        else if (typeof part.type === "string" && part.type.startsWith("tool-")) toolCalls += 1;
      }
    });

    return {
      messages: messages.length,
      userMessages,
      assistantMessages,
      toolCalls,
      userTokens,
      assistantTokens,
      thinkingTokens,
    };
  }, [contextPanelVisible, contextStats, estimateTokens, messages, parseThinking]);

  return {
    maxContext,
    contextMessages,
    contextStats,
    contextUsageLabel,
    contextBreakdown,
    buildContextContent,
    formatTokenCount,
    calculateMessageTokens,
    estimateTokens,
    contextConfig,
    calculateStats,
  };
}
