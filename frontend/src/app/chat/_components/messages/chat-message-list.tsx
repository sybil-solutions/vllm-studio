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
import { PerfProfiler } from "../perf/perf-profiler";
import type { AgentFileEntry, Artifact, ChatMessage } from "@/lib/types";

// Check if a message is tool-only (assistant message with only tool parts, no text content)
function isToolOnlyMessage(message: ChatMessage): boolean {
  if (message.role !== "assistant") return false;

  let hasToolParts = false;
  for (const part of message.parts) {
    if (part.type === "text") {
      const text = (part as { text?: unknown }).text;
      if (typeof text === "string" && text.trim().length > 0) return false;
      continue;
    }
    if (part.type === "dynamic-tool") {
      hasToolParts = true;
      continue;
    }
    if (typeof part.type === "string" && part.type.startsWith("tool-")) {
      hasToolParts = true;
    }
  }

  return hasToolParts;
}

type MessageGroup =
  | { type: "single"; message: ChatMessage; messageIndex: number }
  ;

function hasNonEmptyText(message: ChatMessage): boolean {
  for (const part of message.parts ?? []) {
    if (!part || typeof part !== "object") continue;
    const type = (part as { type?: unknown }).type;
    if (type !== "text") continue;
    const text = (part as { text?: unknown }).text;
    if (typeof text === "string" && text.trim().length > 0) return true;
  }
  return false;
}

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  artifactsEnabled?: boolean;
  artifactsByMessage?: Map<string, Artifact[]>;
  selectedModel?: string;
  contextUsageLabel?: string | null;
  agentFiles?: AgentFileEntry[];
  selectedAgentFilePath?: string | null;
  onOpenAgentFile?: (path: string) => void;
  scrollParent?: HTMLElement | null;
  messagesEndRef?: RefObject<HTMLDivElement | null>;
  onFork?: (messageId: string) => void;
  onReprompt?: (messageId: string) => void;
  onOpenContext?: () => void;
}

const VirtuosoList = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={`flex flex-col gap-3 md:gap-4 ${className ?? ""}`} {...props} />
  ),
);

VirtuosoList.displayName = "VirtuosoList";

export function ChatMessageList({
  messages,
  isLoading,
  artifactsEnabled = false,
  artifactsByMessage,
  selectedModel,
  contextUsageLabel,
  agentFiles,
  selectedAgentFilePath,
  onOpenAgentFile,
  scrollParent,
  messagesEndRef,
  onFork,
  onReprompt,
  onOpenContext,
}: ChatMessageListProps) {
  const lastRawMessageId = messages[messages.length - 1]?.id;

  // Filter out internal/continuation messages from display
  const visibleMessages = useMemo(
    () =>
      messages.filter((m) => {
        const metadata = m.metadata as { internal?: boolean } | undefined;
        if (metadata?.internal) return false;

        // Keep the in-flight assistant message mounted while loading to avoid flicker
        // (it may start empty and later receive streamed text).
        if (isLoading && m.role === "assistant" && m.id === lastRawMessageId) return true;

        // Desktop transcript should be "conversation only":
        // Hide tool-only assistant messages (they live in the Activity panel).
        if (isToolOnlyMessage(m)) return false;

        // Also hide assistant messages that carry no user-visible text.
        // (Reasoning/tool telemetry is handled elsewhere; artifacts are still shown.)
        if (m.role === "assistant") {
          const hasArtifacts = Boolean(artifactsByMessage?.get(m.id)?.length);
          if (!hasArtifacts && !hasNonEmptyText(m)) return false;
        }
        return true;
      }),
    [artifactsByMessage, isLoading, lastRawMessageId, messages],
  );

  const deferredVisibleMessages = useDeferredValue(visibleMessages);
  const baseMessages = isLoading ? deferredVisibleMessages : visibleMessages;

  const messageGroups = useMemo<MessageGroup[]>(() => {
    const groups: MessageGroup[] = baseMessages.map((message, idx) => ({
      type: "single",
      message,
      messageIndex: idx,
    }));

    // While streaming, keep the last assistant message "live" (avoid deferred tearing).
    if (!isLoading) return groups;
    const liveLast = visibleMessages[visibleMessages.length - 1];
    if (!liveLast || liveLast.role !== "assistant") return groups;
    const lastGroup = groups[groups.length - 1];
    if (lastGroup?.type === "single" && lastGroup.message.id === liveLast.id) {
      return [...groups.slice(0, -1), { ...lastGroup, message: liveLast }];
    }
    return groups;
  }, [baseMessages, isLoading, visibleMessages]);

  const fileChips = useMemo(() => flattenAgentFiles(agentFiles ?? []), [agentFiles]);
  const hasAgentFiles = fileChips.length > 0 && onOpenAgentFile;

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
    (_index: number, group: MessageGroup) => {
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
      contextUsageLabel,
      handleExport,
      isLoading,
      onFork,
      onOpenContext,
      onReprompt,
      selectedModel,
      visibleMessages.length,
    ],
  );

  const Footer = useCallback(() => {
    return (
      <div className="pt-4">
        {hasAgentFiles && onOpenAgentFile && (
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-[0.24em] text-[#6a6560] mb-2">
              Agent Files
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {fileChips.map((file) => {
                const Icon = fileIcon(file.name);
                const isSelected = selectedAgentFilePath === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => onOpenAgentFile(file.path)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono border transition-colors whitespace-nowrap ${
                      isSelected
                        ? "bg-violet-500/20 text-violet-200 border-violet-500/40"
                        : "bg-white/4 text-[#b6b1aa] border-white/10 hover:text-[#e8e4dd] hover:bg-white/8"
                    }`}
                    title={file.path}
                  >
                    <Icon className="h-3 w-3" />
                    <span className="max-w-[160px] truncate">{file.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    );
  }, [
    fileChips,
    hasAgentFiles,
    isLoading,
    messagesEndRef,
    onOpenAgentFile,
    selectedAgentFilePath,
  ]);

  const virtuosoComponents = useMemo(() => {
    return { List: VirtuosoList, Footer };
  }, [Footer]);

  const computeItemKey = useCallback((_index: number, group: MessageGroup) => {
    return group.message.id;
  }, []);

  const scrollParentElement = scrollParent ?? undefined;

  return (
    <div className="flex flex-col gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 max-w-4xl mx-auto w-full">
      <PerfProfiler id="chat-message-list">
        <Virtuoso
          customScrollParent={scrollParentElement}
          data={messageGroups}
          itemContent={renderGroup}
          components={virtuosoComponents}
          computeItemKey={computeItemKey}
        />
      </PerfProfiler>
    </div>
  );
}

type AgentFileChip = { path: string; name: string };

function getFileExtension(name: string): string {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function fileIcon(name: string) {
  const ext = getFileExtension(name);
  if (["ts", "tsx", "js", "jsx", "py", "rs", "go", "rb", "java", "c", "cpp", "h", "css", "scss", "html"].includes(ext))
    return Icons.FileCode;
  if (["json", "yaml", "yml", "toml", "xml"].includes(ext)) return Icons.FileJson;
  if (["md", "txt", "csv", "log", "env"].includes(ext)) return Icons.FileText;
  if (["png", "jpg", "jpeg", "gif", "svg", "webp", "ico"].includes(ext)) return Icons.File;
  return Icons.File;
}

function flattenAgentFiles(entries: AgentFileEntry[], parentPath: string = ""): AgentFileChip[] {
  const result: AgentFileChip[] = [];
  for (const entry of entries) {
    const fullPath = parentPath ? `${parentPath}/${entry.name}` : entry.name;
    if (entry.type === "file") {
      result.push({ path: fullPath, name: entry.name });
    } else if (entry.children) {
      result.push(...flattenAgentFiles(entry.children, fullPath));
    }
  }
  return result;
}
