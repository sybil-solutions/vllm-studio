// CRITICAL
"use client";

import { safeJsonStringify } from "@/lib/safe-json";
import { createUuid } from "@/lib/uuid";
import type { ChatMessage, ChatMessageMetadata, ChatMessagePart, StoredMessage, StoredToolCall } from "@/lib/types";
import { tryParseNestedJsonString } from "../../../utils";

export function mapStoredToolCallsImpl(toolCalls?: StoredToolCall[]): ChatMessagePart[] {
  if (!toolCalls?.length) return [];
  return toolCalls.map((tc) => {
    const name = tc.function?.name || "tool";
    const args = tc.function?.arguments;
    const input = typeof args === "string" ? (tryParseNestedJsonString(args) ?? args) : args;
    const result = tc.result as { content?: unknown; isError?: boolean } | string | undefined;
    const hasResult = result != null;
    const isError = typeof result === "object" && result?.isError === true;
    const content = typeof result === "object" ? (result?.content ?? result) : result;

    return {
      type: tc.dynamic ? "dynamic-tool" : `tool-${name}`,
      toolName: tc.dynamic ? name : undefined,
      toolCallId: tc.id,
      state: hasResult ? (isError ? "output-error" : "output-available") : "input-available",
      input,
      output: isError ? undefined : content,
      errorText: isError ? (typeof content === "string" ? content : safeJsonStringify(content, "")) : undefined,
      providerExecuted: tc.providerExecuted,
    };
  });
}

export function mapStoredMessagesImpl(storedMessages: StoredMessage[]): ChatMessage[] {
  return storedMessages.map((message) => {
    const storedParts = message.parts as ChatMessagePart[] | undefined;
    const hasStoredParts = Array.isArray(storedParts) && storedParts.length > 0;
    const parts: ChatMessagePart[] = hasStoredParts ? [...storedParts] : [];

    if (!hasStoredParts && message.content) {
      parts.push({ type: "text", text: message.content });
    }

    if (!hasStoredParts) {
      const toolParts = mapStoredToolCallsImpl(message.tool_calls);
      for (const toolPart of toolParts) {
        parts.push(toolPart);
      }
    }

    const inputTokens = message.prompt_tokens ?? undefined;
    const outputTokens = message.completion_tokens ?? undefined;
    const totalTokens =
      message.total_tokens ??
      (inputTokens != null || outputTokens != null ? (inputTokens ?? 0) + (outputTokens ?? 0) : undefined);

    const metadata = message.metadata as ChatMessageMetadata | undefined;

    return {
      id: message.id,
      role: message.role,
      parts,
      metadata:
        metadata ??
        ({
          model: message.model,
          usage:
            inputTokens != null || outputTokens != null || totalTokens != null
              ? {
                  inputTokens,
                  outputTokens,
                  totalTokens,
                }
              : undefined,
        } satisfies ChatMessageMetadata),
      model: message.model,
      tool_calls: message.tool_calls,
      content: message.content,
      created_at: (message as { created_at?: string }).created_at,
    } satisfies ChatMessage;
  });
}

export function isToolPart(part: ChatMessagePart): part is Extract<ChatMessagePart, { toolCallId: string }> {
  return part.type === "dynamic-tool" || (typeof part.type === "string" && part.type.startsWith("tool-"));
}

export function mergeToolParts(previous: ChatMessagePart[], next: ChatMessagePart[]): ChatMessagePart[] {
  if (previous.length === 0) return next;
  const previousById = new Map<string, Extract<ChatMessagePart, { toolCallId: string }>>();
  for (const part of previous) {
    if (isToolPart(part)) {
      previousById.set(part.toolCallId, part);
    }
  }
  return next.map((part) => {
    if (!isToolPart(part)) return part;
    const prior = previousById.get(part.toolCallId);
    if (!prior) return part;
    const merged = {
      ...prior,
      ...part,
      input: part.input ?? (prior as { input?: unknown }).input,
      output: part.output ?? (prior as { output?: unknown }).output,
      errorText: part.errorText ?? (prior as { errorText?: string }).errorText,
      state: part.state ?? (prior as { state?: string }).state,
      toolName: part.toolName ?? (prior as { toolName?: string }).toolName,
      providerExecuted: part.providerExecuted ?? (prior as { providerExecuted?: boolean }).providerExecuted,
    } satisfies Extract<ChatMessagePart, { toolCallId: string }>;
    return merged;
  });
}

function mapAgentContentToParts(content: unknown): ChatMessagePart[] {
  if (typeof content === "string") {
    return content.trim() ? [{ type: "text", text: content }] : [];
  }
  if (!Array.isArray(content)) return [];
  const parts: ChatMessagePart[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    const type = record["type"];
    if (type === "text") {
      const text = typeof record["text"] === "string" ? record["text"] : "";
      if (text) parts.push({ type: "text", text });
      continue;
    }
    if (type === "thinking") {
      const thinking = typeof record["thinking"] === "string" ? record["thinking"] : "";
      if (thinking) parts.push({ type: "reasoning", text: thinking });
      continue;
    }
    if (type === "toolCall") {
      const toolCallId = typeof record["id"] === "string" ? record["id"] : "";
      if (!toolCallId) continue;
      parts.push({
        type: "dynamic-tool",
        toolCallId,
        toolName: typeof record["name"] === "string" ? record["name"] : "tool",
        input: record["arguments"] ?? {},
        state: "input-available",
      });
    }
  }
  return parts;
}

function mapUserContentToParts(content: unknown): ChatMessagePart[] {
  if (typeof content === "string") {
    return content.trim() ? [{ type: "text", text: content }] : [];
  }
  if (!Array.isArray(content)) return [];
  const parts: ChatMessagePart[] = [];
  for (const block of content) {
    if (!block || typeof block !== "object") continue;
    const record = block as Record<string, unknown>;
    if (record["type"] === "text") {
      const text = typeof record["text"] === "string" ? record["text"] : "";
      if (text) parts.push({ type: "text", text });
    } else if (record["type"] === "image") {
      parts.push({ type: "text", text: "[Image]" });
    }
  }
  return parts;
}

function buildMetadataFromAgent(message: Record<string, unknown>): ChatMessageMetadata | undefined {
  const model = typeof message["model"] === "string" ? message["model"] : undefined;
  const usage = message["usage"] as Record<string, unknown> | undefined;
  const input = typeof usage?.["input"] === "number" ? usage["input"] : undefined;
  const output = typeof usage?.["output"] === "number" ? usage["output"] : undefined;
  const total = typeof usage?.["totalTokens"] === "number" ? usage["totalTokens"] : undefined;
  if (model || input != null || output != null || total != null) {
    return {
      model,
      usage: input != null || output != null || total != null ? { inputTokens: input, outputTokens: output, totalTokens: total } : undefined,
    };
  }
  return undefined;
}

export function mapAgentMessageToChatMessageImpl(
  rawMessage: Record<string, unknown>,
  messageId?: string,
  runMeta?: { runId?: string; turnIndex?: number },
): ChatMessage | null {
  const role = rawMessage["role"];
  if (role !== "user" && role !== "assistant") return null;
  const id = messageId ?? (typeof rawMessage["id"] === "string" ? rawMessage["id"] : createUuid());
  const content = rawMessage["content"];
  const parts = role === "assistant" ? mapAgentContentToParts(content) : mapUserContentToParts(content);
  const baseMetadata =
    role === "assistant" ? buildMetadataFromAgent(rawMessage) : (rawMessage["metadata"] as ChatMessageMetadata | undefined);
  const mergedMetadata =
    runMeta?.runId || typeof runMeta?.turnIndex === "number"
      ? {
          ...(baseMetadata ?? {}),
          ...(runMeta?.runId ? { runId: runMeta.runId } : {}),
          ...(typeof runMeta?.turnIndex === "number" ? { turnIndex: runMeta.turnIndex } : {}),
        }
      : baseMetadata;
  return {
    id,
    role,
    parts,
    metadata: mergedMetadata,
  };
}
