// CRITICAL
"use client";

import type { ActivityGroup, ActivityItem } from "@/app/chat/types";
import type { ToolResult, ChatMessage, ChatMessagePart } from "@/lib/types";
import { thinkingParser } from "@/lib/services/message-parsing";

const TOOL_PENDING_STATES = new Set([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
]);

const TOOL_ERROR_STATES = new Set(["output-error", "output-denied"]);

export function extractThinkingFromMessage(message: ChatMessage) {
  const reasoningLines: string[] = [];
  let textContent = "";

  for (const part of message.parts) {
    if (part.type === "reasoning") {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text) reasoningLines.push(text);
      continue;
    }
    if (part.type === "text") {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text) textContent += text;
    }
  }

  const reasoningFromParts = reasoningLines.join("\n");

  const lower = textContent.toLowerCase();
  const hasThinkTags =
    lower.includes("<think") ||
    lower.includes("</think") ||
    lower.includes("<thinking") ||
    lower.includes("</thinking");

  const parsed = hasThinkTags ? thinkingParser.parse(textContent) : null;
  const thinkTagContent = parsed?.thinkingContent || "";

  const combined = [reasoningFromParts, thinkTagContent].filter(Boolean).join("\n\n");

  return {
    content: combined,
    isComplete: parsed?.isThinkingComplete ?? true,
  };
}

const isToolPart = (part: ChatMessagePart): part is ChatMessagePart & { toolCallId: string; input?: unknown } => {
  if (typeof part.type !== "string") return false;
  if (part.type === "dynamic-tool") return "toolCallId" in part;
  return part.type.startsWith("tool-") && "toolCallId" in part;
};

export function buildActivityGroups({
  messages,
  isLoading,
  executingTools,
  toolResultsMap,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  executingTools: Set<string>;
  toolResultsMap: Map<string, ToolResult>;
}): ActivityGroup[] {
  const assistantMessages = messages.filter((m) => m.role === "assistant");
  if (assistantMessages.length === 0) return [];

  const getRunKey = (message: ChatMessage): string | null => {
    const metadata = message.metadata as Record<string, unknown> | undefined;
    if (metadata && typeof metadata["runId"] === "string") {
      return metadata["runId"] as string;
    }
    return null;
  };

  const lastAssistantId = assistantMessages[assistantMessages.length - 1]?.id;
  let lastAssistantKey: string | null = null;
  let currentRunKey: string | null = null;

  for (const msg of messages) {
    if (msg.role === "user") {
      currentRunKey = getRunKey(msg) ?? msg.id;
      continue;
    }
    if (msg.role !== "assistant") continue;
    const key = getRunKey(msg) ?? currentRunKey ?? msg.id;
    if (msg.id === lastAssistantId) {
      lastAssistantKey = key;
    }
  }

  const buildItemsForMessage = (
    msg: ChatMessage,
    isLatestMessage: boolean,
    turnNumber: number,
    messageOrdinal: number,
  ): ActivityItem[] => {
    const items: ActivityItem[] = [];
    const tsBase = turnNumber * 1_000_000 + messageOrdinal * 1_000;

    msg.parts.forEach((part, partIndex) => {
      if (part.type === "reasoning" && "text" in part && part.text) {
        items.push({
          id: `activity-${msg.id}-thinking-${partIndex}`,
          type: "thinking",
          timestamp: tsBase + partIndex,
          content: part.text,
          isActive: isLatestMessage && isLoading && partIndex === msg.parts.length - 1,
        });
        return;
      }

      if (!isToolPart(part)) return;

      const toolCallId = String(part.toolCallId);
      const result = toolResultsMap.get(toolCallId);
      const isExecuting = executingTools.has(toolCallId);

      const partState = "state" in part ? (part as { state?: string }).state : undefined;
      const partHasOutput = "output" in part && (part as { output?: unknown }).output != null;

      const rawToolName =
        part.type === "dynamic-tool"
          ? "toolName" in part
            ? String(part.toolName)
            : "tool"
          : part.type.replace(/^tool-/, "");
      const toolName = rawToolName.includes("__") ? rawToolName.split("__").slice(1).join("__") : rawToolName;

      let itemState: "pending" | "running" | "complete" | "error" = "pending";
      if (isExecuting) {
        itemState = "running";
      } else if (result) {
        itemState = result.isError ? "error" : "complete";
      } else if (partState && TOOL_ERROR_STATES.has(partState)) {
        itemState = "error";
      } else if (partState === "output-available" || partState === "result" || partHasOutput) {
        itemState = "complete";
      } else if (partState && TOOL_PENDING_STATES.has(partState)) {
        itemState = "running";
      }

      items.push({
        id: `activity-${msg.id}-${toolCallId}`,
        type: "tool-call",
        timestamp: tsBase + partIndex,
        toolName,
        toolCallId,
        state: itemState,
        input: "input" in part ? part.input : undefined,
        output: result?.content ?? (partHasOutput ? (part as { output: unknown }).output : undefined),
      });
    });

    const textThinking = extractThinkingFromMessage(msg);
    if (textThinking.content && !items.some((i) => i.type === "thinking")) {
      items.unshift({
        id: `activity-${msg.id}-thinking-text`,
        type: "thinking",
        timestamp: tsBase - 1,
        content: textThinking.content,
        isActive: isLatestMessage && isLoading,
      });
    }

    return items;
  };

  const groups: ActivityGroup[] = [];
  const groupsByKey = new Map<string, ActivityGroup>();
  const runKeyToTurn = new Map<string, number>();
  let currentTurnNumber = 0;
  currentRunKey = null;

  let assistantOrdinal = 0;
  for (const msg of messages) {
    if (msg.role === "user") {
      currentRunKey = getRunKey(msg) ?? msg.id;
      if (!runKeyToTurn.has(currentRunKey)) {
        currentTurnNumber += 1;
        runKeyToTurn.set(currentRunKey, currentTurnNumber);
      }
      continue;
    }
    if (msg.role !== "assistant") continue;

    assistantOrdinal += 1;
    const key = getRunKey(msg) ?? currentRunKey ?? msg.id;
    if (!runKeyToTurn.has(key)) {
      currentTurnNumber += 1;
      runKeyToTurn.set(key, currentTurnNumber);
    }
    const turnNumber = runKeyToTurn.get(key) ?? currentTurnNumber;
    const isLatestMessage = msg.id === lastAssistantId;
    const items = buildItemsForMessage(msg, isLatestMessage, turnNumber, assistantOrdinal);
    if (items.length === 0) continue;

    let group = groupsByKey.get(key);
    if (!group) {
      group = {
        id: `activity-group-${key}`,
        messageId: msg.id,
        title: "",
        isLatest: false,
        turnNumber,
        items: [],
      };
      groupsByKey.set(key, group);
      groups.push(group);
    }
    group.items.push(...items);
  }

  groups.forEach((group) => {
    const isLatest = group.id === (lastAssistantKey ? `activity-group-${lastAssistantKey}` : "");
    group.isLatest = isLatest;
    const label = group.turnNumber > 0 ? `Turn ${group.turnNumber}` : "Turn";
    group.title = isLatest ? `Current (${label})` : label;
  });

  return groups.reverse();
}
