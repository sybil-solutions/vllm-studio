// CRITICAL
"use client";

import { useCallback } from "react";
import type { Dispatch, SetStateAction } from "react";
import { safeJsonStringify } from "@/lib/safe-json";
import type { ChatMessage, ChatMessagePart, ToolResult } from "@/lib/types";

type UseChatToolResultsArgs = {
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>;
  isToolPart: (part: ChatMessagePart) => part is Extract<ChatMessagePart, { toolCallId: string }>;
  updateToolResultsMap: (updater: (prev: Map<string, ToolResult>) => Map<string, ToolResult>) => void;
};

export function useChatToolResults({ setMessages, isToolPart, updateToolResultsMap }: UseChatToolResultsArgs) {
  const extractToolResultText = useCallback((result: unknown): string => {
    if (result == null) return "";
    if (typeof result === "string") return result;
    if (Array.isArray(result)) {
      return result
        .filter(
          (item) =>
            item &&
            typeof item === "object" &&
            (item as Record<string, unknown>)["type"] === "text",
        )
        .map((item) => String((item as Record<string, unknown>)["text"] ?? ""))
        .join("\n");
    }
    if (typeof result === "object") {
      const record = result as Record<string, unknown>;
      if (Array.isArray(record["content"])) {
        return extractToolResultText(record["content"]);
      }
      if (typeof record["text"] === "string") {
        return record["text"];
      }
      return safeJsonStringify(record, "");
    }
    return String(result);
  }, []);

  const applyToolResultToMessages = useCallback(
    (toolCallId: string, resultText: string, isError: boolean) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.role !== "assistant") return msg;
          let updated = false;
          const parts = msg.parts.map((part) => {
            if (!isToolPart(part) || part.toolCallId !== toolCallId) return part;
            updated = true;
            return {
              ...part,
              state: isError ? "output-error" : "output-available",
              output: isError ? undefined : resultText,
              errorText: isError ? resultText : undefined,
            } as ChatMessagePart;
          });
          return updated ? { ...msg, parts } : msg;
        }),
      );
    },
    [isToolPart, setMessages],
  );

  const recordToolResult = useCallback(
    (toolCallId: string, resultText: string, isError: boolean) => {
      updateToolResultsMap((prev) => {
        const next = new Map(prev);
        const payload: ToolResult = {
          tool_call_id: toolCallId,
          content: resultText,
          isError,
        };
        next.set(toolCallId, payload);
        return next;
      });
      applyToolResultToMessages(toolCallId, resultText, isError);
    },
    [applyToolResultToMessages, updateToolResultsMap],
  );

  return { extractToolResultText, recordToolResult };
}

