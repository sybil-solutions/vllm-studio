// CRITICAL
"use client";

import {
  forwardRef,
  useCallback,
  useDeferredValue,
  useMemo,
  type HTMLAttributes,
  type RefObject,
} from "react";
import { Virtuoso } from "react-virtuoso";
import * as Icons from "../icons";
import { ChatMessageItem } from "./chat-message-item";
import { ToolCallGroup } from "./tool-call-group";
import { PerfProfiler } from "../perf/perf-profiler";
import { useAppStore } from "@/store";
import type { Artifact, ChatMessage } from "@/lib/types";

// Check if a message is tool-only (assistant message with only tool parts, no text content)
function isToolOnlyMessage(message: ChatMessage): boolean {
  if (message.role !== "assistant") return false;

  const textContent = message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("")
    .trim();

  const hasToolParts = message.parts.some(
    (part) =>
      part.type === "dynamic-tool" ||
      (typeof part.type === "string" && part.type.startsWith("tool-")),
  );

  return hasToolParts && !textContent;
}

type MessageGroup =
  | { type: "single"; message: ChatMessage; messageIndex: number }
  | {
      type: "tool-group";
      messages: ChatMessage[];
      groupId: string;
      startIndex: number;
      endIndex: number;
    };

// Group consecutive tool-only messages
function groupMessages(messages: ChatMessage[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  let currentToolGroup: ChatMessage[] = [];
  let currentToolStartIndex = -1;

  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (isToolOnlyMessage(message)) {
      if (currentToolGroup.length === 0) {
        currentToolStartIndex = index;
      }
      currentToolGroup.push(message);
    } else {
      // Flush any pending tool group
      if (currentToolGroup.length > 0) {
        if (currentToolGroup.length === 1) {
          // Single tool-only message, render normally
          groups.push({
            type: "single",
            message: currentToolGroup[0],
            messageIndex: currentToolStartIndex,
          });
        } else {
          // Multiple consecutive tool-only messages, group them
          groups.push({
            type: "tool-group",
            messages: currentToolGroup,
            groupId: currentToolGroup[0].id,
            startIndex: currentToolStartIndex,
            endIndex: index - 1,
          });
        }
        currentToolGroup = [];
        currentToolStartIndex = -1;
      }
      groups.push({ type: "single", message, messageIndex: index });
    }
  }

  // Flush any remaining tool group
  if (currentToolGroup.length > 0) {
    if (currentToolGroup.length === 1) {
      groups.push({
        type: "single",
        message: currentToolGroup[0],
        messageIndex: currentToolStartIndex,
      });
    } else {
      groups.push({
        type: "tool-group",
        messages: currentToolGroup,
        groupId: currentToolGroup[0].id,
        startIndex: currentToolStartIndex,
        endIndex: messages.length - 1,
      });
    }
  }

  return groups;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string | null;
  artifactsEnabled?: boolean;
  artifactsByMessage?: Map<string, Artifact[]>;
  selectedModel?: string;
  contextUsageLabel?: string | null;
  scrollParent?: HTMLElement | null;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  onFork?: (messageId: string) => void;
  onReprompt?: (messageId: string) => void;
  onOpenContext?: () => void;
}

const VirtuosoList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`flex flex-col gap-4 ${className ?? ""}`} {...props} />
  ),
);

VirtuosoList.displayName = "VirtuosoList";

export function ChatMessageList({
  messages,
  isLoading,
  error,
  artifactsEnabled = false,
  artifactsByMessage,
  selectedModel,
  contextUsageLabel,
  scrollParent,
  messagesEndRef,
  onFork,
  onReprompt,
  onOpenContext,
}: ChatMessageListProps) {
  const copiedMessageId = useAppStore((state) => state.copiedMessageId);
  const setCopiedMessageId = useAppStore((state) => state.setCopiedMessageId);

  // Filter out internal/continuation messages from display
  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const metadata = m.metadata as { internal?: boolean } | undefined;
        return !metadata?.internal;
      }),
    [messages],
  );

  const deferredVisibleMessages = useDeferredValue(visibleMessages);
  const baseMessages = isLoading ? deferredVisibleMessages : visibleMessages;

  // Group consecutive tool-only messages
  const baseGroups = useMemo(() => groupMessages(baseMessages), [baseMessages]);

  const messageGroups = useMemo(() => {
    if (!isLoading) return baseGroups;
    const liveLast = visibleMessages[visibleMessages.length - 1];
    if (!liveLast || liveLast.role !== "assistant") return baseGroups;
    const lastGroup = baseGroups[baseGroups.length - 1];
    if (lastGroup?.type === "single" && lastGroup.message.id === liveLast.id) {
      return [...baseGroups.slice(0, -1), { ...lastGroup, message: liveLast }];
    }
    return baseGroups;
  }, [baseGroups, isLoading, visibleMessages]);

  const lastMessage = visibleMessages[visibleMessages.length - 1];
  const showLoadingIndicator = isLoading && messages[messages.length - 1]?.role === "user";

  const handleCopy = useCallback(async (text: string, messageId: string) => {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMessageId(messageId);
      window.setTimeout(() => {
        const current = useAppStore.getState().copiedMessageId;
        if (current === messageId) {
          setCopiedMessageId(null);
        }
      }, 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  }, [setCopiedMessageId]);

  const handleExport = useCallback(
    (payload: {
      messageId: string;
      role: "user" | "assistant";
      content: string;
      model?: string;
      totalTokens?: number;
    }) => {
      if (!payload.content.trim()) return;

      const headerLines = [
        `# ${payload.role === "assistant" ? "Assistant" : "User"} Message`,
        payload.model ? `Model: ${payload.model}` : null,
        payload.totalTokens ? `Total tokens: ${payload.totalTokens}` : null,
        `Exported: ${new Date().toLocaleString()}`,
        "",
      ].filter(Boolean);

      const md = [...headerLines, payload.content].join("\n");

      const blob = new Blob([md], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `message-${payload.messageId}.md`;
      a.click();
      URL.revokeObjectURL(url);
    },
    [],
  );

  const renderGroup = useCallback(
    (index: number, group: MessageGroup) => {
      if (group.type === "tool-group") {
        // Check if last message in group is the last visible message and still streaming
        const lastGroupMsg = group.messages[group.messages.length - 1];
        const isLastAndStreaming =
          isLoading && lastGroupMsg.id === lastMessage?.id && lastGroupMsg.role === "assistant";
        return (
          <ToolCallGroup
            key={group.groupId}
            groupId={group.groupId}
            messages={group.messages}
            isStreaming={isLastAndStreaming}
          />
        );
      }

      const message = group.message;
      return (
        <ChatMessageItem
          key={message.id}
          message={message}
          isStreaming={
            isLoading &&
            group.messageIndex === visibleMessages.length - 1 &&
            message.role === "assistant"
          }
          artifactsEnabled={artifactsEnabled}
          artifacts={artifactsByMessage?.get(message.id)}
          selectedModel={selectedModel}
          contextUsageLabel={contextUsageLabel}
          copied={copiedMessageId === message.id}
          onCopy={handleCopy}
          onOpenContext={onOpenContext}
          onFork={message.role === "assistant" ? onFork : undefined}
          onReprompt={message.role === "assistant" ? onReprompt : undefined}
          onExport={handleExport}
        />
      );
    },
    [
      artifactsByMessage,
      artifactsEnabled,
      copiedMessageId,
      contextUsageLabel,
      handleCopy,
      handleExport,
      isLoading,
      lastMessage?.id,
      onFork,
      onOpenContext,
      onReprompt,
      selectedModel,
      visibleMessages.length,
    ],
  );

  const Footer = () => (
    <div className="pt-4">
      {showLoadingIndicator && (
        <div className="flex items-center gap-2 text-[#9a9590]">
          <Icons.Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm">Generating response...</span>
        </div>
      )}
      {error && (
        <div className="mt-3 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  const scrollParentElement = scrollParent ?? undefined;

  return (
    <div className="flex flex-col gap-4 px-4 md:px-6 py-4 max-w-4xl mx-auto w-full">
      <PerfProfiler id="chat-message-list">
        <Virtuoso
          customScrollParent={scrollParentElement}
          data={messageGroups}
          itemContent={renderGroup}
          components={{ List: VirtuosoList, Footer }}
          computeItemKey={(index, group) =>
            group.type === "tool-group" ? group.groupId : group.message.id
          }
        />
      </PerfProfiler>
    </div>
  );
}
