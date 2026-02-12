// CRITICAL
"use client";

import { useMemo } from "react";
import type { ActivityGroup, ThinkingState } from "@/app/chat/types";
import type { ToolResult, ChatMessage } from "@/lib/types";
import { buildActivityGroups, extractThinkingFromMessage } from "./use-chat-derived/build-activity-groups";

interface UseChatDerivedOptions {
  messages: ChatMessage[];
  isLoading: boolean;
  executingTools: Set<string>;
  toolResultsMap: Map<string, ToolResult>;
  enableActivityGroups?: boolean;
}

export function useChatDerived({
  messages,
  isLoading,
  executingTools,
  toolResultsMap,
  enableActivityGroups = true,
}: UseChatDerivedOptions) {
  const lastAssistantMessage = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const msg = messages[i];
      if (msg.role === "assistant") return msg;
    }
    return null;
  }, [messages]);

  // Build activity groups by run (one user prompt) with chronologically interleaved items
  const activityGroups = useMemo<ActivityGroup[]>(() => {
    if (!enableActivityGroups) return [];
    return buildActivityGroups({ messages, isLoading, executingTools, toolResultsMap });
  }, [enableActivityGroups, messages, executingTools, isLoading, toolResultsMap]);

  const hasToolActivity = enableActivityGroups
    ? activityGroups.some((group) => group.items.some((i) => i.type === "tool-call")) ||
      executingTools.size > 0
    : executingTools.size > 0;

  const thinkingState = useMemo<ThinkingState>(() => {
      if (!enableActivityGroups) {
      if (!lastAssistantMessage) return { content: "", isComplete: !isLoading };
      const extracted = extractThinkingFromMessage(lastAssistantMessage);
      return {
        content: extracted.content,
        isComplete: !isLoading,
      };
    }
    const latestGroup = activityGroups[0];
    if (!latestGroup) return { content: "", isComplete: true };

    // Find the latest thinking item
    const thinkingItems = latestGroup.items.filter((i) => i.type === "thinking");
    const latestThinking = thinkingItems[thinkingItems.length - 1];

    return {
      content: latestThinking?.content || "",
      isComplete: !isLoading,
    };
  }, [enableActivityGroups, activityGroups, isLoading, lastAssistantMessage]);

  const thinkingActive = useMemo(() => {
    if (enableActivityGroups) {
      return Boolean(
        activityGroups[0]?.items.some((i) => i.type === "thinking" && i.isActive),
      );
    }
    if (!isLoading || !lastAssistantMessage) return false;
    const hasReasoning = lastAssistantMessage.parts.some(
      (part) => part.type === "reasoning" && "text" in part && Boolean(part.text),
    );
    if (hasReasoning) return true;
    const textContent = lastAssistantMessage.parts
      .filter((p): p is { type: "text"; text: string } => p.type === "text")
      .map((p) => p.text)
      .join("");
    return /<think(ing)?\b/i.test(textContent);
  }, [activityGroups, enableActivityGroups, isLoading, lastAssistantMessage]);

  const hasSidePanelContent = enableActivityGroups
    ? activityGroups.length > 0 || hasToolActivity || thinkingState.content.length > 0
    : hasToolActivity;

  return {
    thinkingState,
    thinkingActive,
    activityGroups,
    hasToolActivity,
    hasSidePanelContent,
    lastAssistantMessage,
  };
}
