// CRITICAL
"use client";

import { memo, useCallback, useMemo, useState, type ReactNode, type RefObject } from "react";
import type { AgentFileEntry, Artifact, ChatMessage } from "@/lib/types";
import * as Icons from "../icons";
import { ChatMessageList } from "../messages/chat-message-list";
import { ChatSplashCanvas } from "./chat-splash-canvas";

interface ChatConversationProps {
  messages: ChatMessage[];
  isLoading: boolean;
  error?: string | null;
  artifactsEnabled?: boolean;
  artifactsByMessage?: Map<string, Artifact[]>;
  selectedModel?: string;
  contextUsageLabel?: string | null;
  agentFiles?: AgentFileEntry[];
  selectedAgentFilePath?: string | null;
  onOpenAgentFile?: (path: string) => void;
  onFork?: (messageId: string) => void;
  onReprompt?: (messageId: string) => void;
  onOpenContext?: () => void;
  showEmptyState: boolean;
  toolBelt: ReactNode;
  onScroll: () => void;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
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

function ChatConversationBase({
  messages,
  isLoading,
  error,
  artifactsEnabled,
  artifactsByMessage,
  selectedModel,
  contextUsageLabel,
  agentFiles,
  selectedAgentFilePath,
  onOpenAgentFile,
  onFork,
  onReprompt,
  onOpenContext,
  showEmptyState,
  toolBelt,
  onScroll,
  messagesContainerRef,
  messagesEndRef,
}: ChatConversationProps) {
  const fileChips = useMemo(() => flattenAgentFiles(agentFiles ?? []), [agentFiles]);
  const hasAgentFiles = fileChips.length > 0;
  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null);

  const handleScrollContainerRef = useCallback(
    (node: HTMLDivElement | null) => {
      messagesContainerRef.current = node;
      setScrollParent(node);
    },
    [messagesContainerRef],
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
      <div
        ref={handleScrollContainerRef}
        onScroll={onScroll}
        className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col"
      >
        <div className="pb-16 md:pb-4 flex-1 flex flex-col">
          <div className="flex-1 relative overflow-hidden flex items-center justify-center px-4 md:px-6 py-10 transition-opacity duration-500 ease-out bg-[hsl(30,5%,10.5%)]">
            <ChatSplashCanvas active={showEmptyState} />
            {showEmptyState ? (
              <div className="relative z-10 w-full max-w-2xl">
                <div className="hidden md:block">{toolBelt}</div>
              </div>
            ) : (
              <div className="relative z-10 flex flex-col min-h-0 w-full">
                {hasAgentFiles && onOpenAgentFile && (
                  <div className="mb-3">
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
                <ChatMessageList
                  messages={messages}
                  isLoading={isLoading}
                  error={error || undefined}
                  artifactsEnabled={artifactsEnabled}
                  artifactsByMessage={artifactsByMessage}
                  selectedModel={selectedModel}
                  contextUsageLabel={contextUsageLabel}
                  scrollParent={scrollParent}
                  messagesEndRef={messagesEndRef}
                  onFork={onFork}
                  onReprompt={onReprompt}
                  onOpenContext={onOpenContext}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function areChatConversationPropsEqual(
  prev: ChatConversationProps,
  next: ChatConversationProps,
): boolean {
  if (prev.showEmptyState || next.showEmptyState) {
    return (
      prev.messages === next.messages &&
      prev.isLoading === next.isLoading &&
      prev.error === next.error &&
      prev.artifactsEnabled === next.artifactsEnabled &&
      prev.artifactsByMessage === next.artifactsByMessage &&
      prev.selectedModel === next.selectedModel &&
      prev.contextUsageLabel === next.contextUsageLabel &&
      prev.agentFiles === next.agentFiles &&
      prev.selectedAgentFilePath === next.selectedAgentFilePath &&
      prev.onOpenAgentFile === next.onOpenAgentFile &&
      prev.onFork === next.onFork &&
      prev.onReprompt === next.onReprompt &&
      prev.onOpenContext === next.onOpenContext &&
      prev.showEmptyState === next.showEmptyState &&
      prev.toolBelt === next.toolBelt &&
      prev.onScroll === next.onScroll &&
      prev.messagesContainerRef === next.messagesContainerRef &&
      prev.messagesEndRef === next.messagesEndRef
    );
  }

  return (
    prev.messages === next.messages &&
    prev.isLoading === next.isLoading &&
    prev.error === next.error &&
    prev.artifactsEnabled === next.artifactsEnabled &&
    prev.artifactsByMessage === next.artifactsByMessage &&
    prev.selectedModel === next.selectedModel &&
    prev.contextUsageLabel === next.contextUsageLabel &&
    prev.agentFiles === next.agentFiles &&
    prev.selectedAgentFilePath === next.selectedAgentFilePath &&
    prev.onOpenAgentFile === next.onOpenAgentFile &&
    prev.onFork === next.onFork &&
    prev.onReprompt === next.onReprompt &&
    prev.onOpenContext === next.onOpenContext &&
    prev.showEmptyState === next.showEmptyState &&
    prev.onScroll === next.onScroll &&
    prev.messagesContainerRef === next.messagesContainerRef &&
    prev.messagesEndRef === next.messagesEndRef
  );
}

export const ChatConversation = memo(ChatConversationBase, areChatConversationPropsEqual);
