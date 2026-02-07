// CRITICAL
"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { safeJsonStringify } from "@/lib/safe-json";
import { createUuid } from "@/lib/uuid";
import type {
  ChatMessage,
  ChatMessageMetadata,
  ChatMessagePart,
  StoredMessage,
  StoredToolCall,
} from "@/lib/types";
import { tryParseNestedJsonString } from "../utils";

type UseChatMessageMappingArgs = {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
};

export function useChatMessageMapping({ setMessages }: UseChatMessageMappingArgs) {
  const mapStoredToolCalls = useCallback((toolCalls?: StoredToolCall[]): ChatMessagePart[] => {
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
        errorText: isError
          ? typeof content === "string"
            ? content
            : safeJsonStringify(content, "")
          : undefined,
        providerExecuted: tc.providerExecuted,
      };
    });
  }, []);

  const mapStoredMessages = useCallback(
    (storedMessages: StoredMessage[]) => {
      return storedMessages.map((message) => {
        const storedParts = message.parts as ChatMessagePart[] | undefined;
        const hasStoredParts = Array.isArray(storedParts) && storedParts.length > 0;
        const parts: ChatMessagePart[] = hasStoredParts ? [...storedParts] : [];

        if (!hasStoredParts && message.content) {
          parts.push({ type: "text", text: message.content });
        }

        if (!hasStoredParts) {
          const toolParts = mapStoredToolCalls(message.tool_calls);
          for (const toolPart of toolParts) {
            parts.push(toolPart);
          }
        }

        const inputTokens = message.prompt_tokens ?? undefined;
        const outputTokens = message.completion_tokens ?? undefined;
        const totalTokens =
          message.total_tokens ??
          (inputTokens != null || outputTokens != null
            ? (inputTokens ?? 0) + (outputTokens ?? 0)
            : undefined);

        const metadata = message.metadata as ChatMessageMetadata | undefined;

        return {
          id: message.id,
          role: message.role,
          parts,
          metadata: metadata ?? {
            model: message.model,
            usage:
              inputTokens != null || outputTokens != null || totalTokens != null
                ? {
                    inputTokens,
                    outputTokens,
                    totalTokens,
                  }
                : undefined,
          },
          model: message.model,
          tool_calls: message.tool_calls,
          content: message.content,
          created_at: (message as { created_at?: string }).created_at,
        } satisfies ChatMessage;
      });
    },
    [mapStoredToolCalls],
  );

  const isToolPart = useCallback(
    (part: ChatMessagePart): part is Extract<ChatMessagePart, { toolCallId: string }> =>
      part.type === "dynamic-tool" ||
      (typeof part.type === "string" && part.type.startsWith("tool-")),
    [],
  );

  const mergeToolParts = useCallback(
    (previous: ChatMessagePart[], next: ChatMessagePart[]) => {
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
          providerExecuted:
            part.providerExecuted ?? (prior as { providerExecuted?: boolean }).providerExecuted,
        } satisfies Extract<ChatMessagePart, { toolCallId: string }>;
        return merged;
      });
    },
    [isToolPart],
  );

  const mapAgentContentToParts = useCallback((content: unknown): ChatMessagePart[] => {
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
  }, []);

  const mapUserContentToParts = useCallback((content: unknown): ChatMessagePart[] => {
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
  }, []);

  const buildMetadataFromAgent = useCallback(
    (message: Record<string, unknown>): ChatMessageMetadata | undefined => {
      const model = typeof message["model"] === "string" ? message["model"] : undefined;
      const usage = message["usage"] as Record<string, unknown> | undefined;
      const input = typeof usage?.["input"] === "number" ? usage["input"] : undefined;
      const output = typeof usage?.["output"] === "number" ? usage["output"] : undefined;
      const total = typeof usage?.["totalTokens"] === "number" ? usage["totalTokens"] : undefined;
      if (model || input != null || output != null || total != null) {
        return {
          model,
          usage:
            input != null || output != null || total != null
              ? { inputTokens: input, outputTokens: output, totalTokens: total }
              : undefined,
        };
      }
      return undefined;
    },
    [],
  );

  const mapAgentMessageToChatMessage = useCallback(
    (
      rawMessage: Record<string, unknown>,
      messageId?: string,
      runMeta?: { runId?: string; turnIndex?: number },
    ): ChatMessage | null => {
      const role = rawMessage["role"];
      if (role !== "user" && role !== "assistant") return null;
      const id =
        messageId ?? (typeof rawMessage["id"] === "string" ? rawMessage["id"] : createUuid());
      const content = rawMessage["content"];
      const parts =
        role === "assistant" ? mapAgentContentToParts(content) : mapUserContentToParts(content);
      const baseMetadata =
        role === "assistant"
          ? buildMetadataFromAgent(rawMessage)
          : (rawMessage["metadata"] as ChatMessageMetadata | undefined);
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
    },
    [buildMetadataFromAgent, mapAgentContentToParts, mapUserContentToParts],
  );

  const upsertMessage = useCallback(
    (message: ChatMessage) => {
      setMessages((prev) => {
        const hasTextPart = message.parts.some(
          (part) => part.type === "text" && typeof part.text === "string" && part.text.trim(),
        );
        const hasToolParts = message.parts.some((part) => isToolPart(part));
        const toolOnly = message.role === "assistant" && hasToolParts && !hasTextPart;

        if (toolOnly) {
          const runId = (message.metadata as { runId?: string } | undefined)?.runId;
          let targetIndex = -1;
          for (let i = prev.length - 1; i >= 0; i -= 1) {
            const candidate = prev[i];
            if (candidate.role !== "assistant") continue;
            const candidateRunId = (candidate.metadata as { runId?: string } | undefined)?.runId;
            if (runId && candidateRunId && runId !== candidateRunId) continue;
            targetIndex = i;
            break;
          }

          if (targetIndex !== -1) {
            const target = prev[targetIndex];
            const mergedParts = mergeToolParts(target.parts, message.parts);
            const mergedMetadata = message.metadata
              ? { ...(target.metadata ?? {}), ...message.metadata }
              : target.metadata;
            const updated: ChatMessage = {
              ...target,
              parts: mergedParts,
              metadata: mergedMetadata,
              tool_calls: message.tool_calls ?? target.tool_calls,
            };
            return [...prev.slice(0, targetIndex), updated, ...prev.slice(targetIndex + 1)];
          }

          const internal = {
            ...message,
            metadata: { ...(message.metadata ?? {}), internal: true },
          };
          return [...prev, internal];
        }

        let nextMessage: ChatMessage = message;
        let nextPrev = prev;
        if (message.role === "assistant") {
          const runId = (message.metadata as { runId?: string } | undefined)?.runId;
          if (runId) {
            const toolOnlyMessages = prev.filter((entry) => {
              if (entry.role !== "assistant") return false;
              const entryRunId = (entry.metadata as { runId?: string } | undefined)?.runId;
              if (entryRunId !== runId) return false;
              const entryHasText = entry.parts.some(
                (part) => part.type === "text" && typeof part.text === "string" && part.text.trim(),
              );
              const entryHasTool = entry.parts.some((part) => isToolPart(part));
              const isInternal = Boolean(
                (entry.metadata as { internal?: boolean } | undefined)?.internal,
              );
              return isInternal && entryHasTool && !entryHasText;
            });

            if (toolOnlyMessages.length > 0) {
              const mergedParts = toolOnlyMessages.reduce(
                (acc, entry) => mergeToolParts(acc, entry.parts),
                message.parts,
              );
              nextMessage = { ...message, parts: mergedParts };
              const toolOnlyIds = new Set(toolOnlyMessages.map((entry) => entry.id));
              nextPrev = prev.filter((entry) => !toolOnlyIds.has(entry.id));
            }
          }
        }

        const index = nextPrev.findIndex((entry) => entry.id === nextMessage.id);
        if (index === -1) {
          return [...nextPrev, nextMessage];
        }
        const existing = nextPrev[index];
        const mergedParts = mergeToolParts(existing.parts, nextMessage.parts);
        const mergedMetadata = nextMessage.metadata
          ? { ...(existing.metadata ?? {}), ...nextMessage.metadata }
          : existing.metadata;
        const updated: ChatMessage = {
          ...existing,
          ...nextMessage,
          parts: mergedParts,
          metadata: mergedMetadata,
          tool_calls: nextMessage.tool_calls ?? existing.tool_calls,
          content: nextMessage.content ?? existing.content,
        };
        return [...nextPrev.slice(0, index), updated, ...nextPrev.slice(index + 1)];
      });
    },
    [isToolPart, mergeToolParts, setMessages],
  );

  return { mapStoredMessages, mapAgentMessageToChatMessage, upsertMessage, isToolPart };
}

