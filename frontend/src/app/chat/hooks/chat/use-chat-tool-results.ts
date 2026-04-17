// CRITICAL
"use client";

import { useCallback } from "react";
import {
  extractToolResultText,
  withToolExecutionEnd,
  withToolExecutionStart,
} from "@/lib/systems/tools/tool-tracker";
import type {
  ChatMessage,
  ChatMessagePart,
  ToolOutputDetails,
  ToolResult,
} from "@/lib/types";

type UseChatToolResultsArgs = {
  setMessages: (next: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  isToolPart: (part: ChatMessagePart) => part is Extract<ChatMessagePart, { toolCallId: string }>;
  updateToolResultsMap: (
    updater: (prev: Map<string, ToolResult>) => Map<string, ToolResult>,
  ) => void;
};

export function useChatToolResults({
  setMessages,
  isToolPart,
  updateToolResultsMap,
}: UseChatToolResultsArgs) {
  const applyToolResultToMessages = useCallback(
    (
      toolCallId: string,
      resultText: string,
      isError: boolean,
      outputDetails?: ToolOutputDetails,
    ) => {
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
              ...(isError ? {} : outputDetails ? { outputDetails } : {}),
            } as ChatMessagePart;
          });
          return updated ? { ...msg, parts } : msg;
        }),
      );
    },
    [isToolPart, setMessages],
  );

  const recordToolResult = useCallback(
    (
      toolCallId: string,
      resultText: string,
      isError: boolean,
      outputDetails?: ToolOutputDetails,
    ) => {
      updateToolResultsMap((prev) =>
        withToolExecutionEnd(prev, toolCallId, resultText, isError, outputDetails),
      );
      applyToolResultToMessages(toolCallId, resultText, isError, outputDetails);
    },
    [applyToolResultToMessages, updateToolResultsMap],
  );

  const recordToolExecutionMetadata = useCallback(
    (toolCallId: string, toolName: string, input: unknown) => {
      updateToolResultsMap((prev) => withToolExecutionStart(prev, toolCallId, toolName, input));
    },
    [updateToolResultsMap],
  );

  return { extractToolResultText, recordToolResult, recordToolExecutionMetadata };
}
