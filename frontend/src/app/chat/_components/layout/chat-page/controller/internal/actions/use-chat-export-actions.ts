// CRITICAL
"use client";

import { useCallback } from "react";
import type { ChatMessage } from "@/lib/types";
import { exportChatAsJson, exportChatAsMarkdown } from "../../../chat-export";

export interface UseChatExportActionsArgs {
  currentSessionId: string | null;
  currentSessionTitle: string;
  selectedModel: string;
  messages: ChatMessage[];
}

export function useChatExportActions({
  currentSessionId,
  currentSessionTitle,
  selectedModel,
  messages,
}: UseChatExportActionsArgs) {
  const onExportJson = useCallback(() => {
    exportChatAsJson({
      title: currentSessionTitle,
      sessionId: currentSessionId,
      model: selectedModel,
      messages,
    });
  }, [currentSessionId, currentSessionTitle, selectedModel, messages]);

  const onExportMarkdown = useCallback(() => {
    exportChatAsMarkdown({
      title: currentSessionTitle,
      sessionId: currentSessionId,
      model: selectedModel,
      messages,
    });
  }, [currentSessionId, currentSessionTitle, selectedModel, messages]);

  return { onExportJson, onExportMarkdown };
}

