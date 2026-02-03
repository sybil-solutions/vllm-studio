// CRITICAL
"use client";

import type { ReactNode, RefObject } from "react";
import type { Artifact, ChatMessage } from "@/lib/types";
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
  onFork?: (messageId: string) => void;
  onReprompt?: (messageId: string) => void;
  onOpenContext?: () => void;
  showEmptyState: boolean;
  toolBelt: ReactNode;
  onScroll: () => void;
  messagesContainerRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
}

export function ChatConversation({
  messages,
  isLoading,
  error,
  artifactsEnabled,
  artifactsByMessage,
  selectedModel,
  contextUsageLabel,
  onFork,
  onReprompt,
  onOpenContext,
  showEmptyState,
  toolBelt,
  onScroll,
  messagesContainerRef,
  messagesEndRef,
}: ChatConversationProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
      <div
        ref={messagesContainerRef}
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
                <ChatMessageList
                  messages={messages}
                  isLoading={isLoading}
                  error={error || undefined}
                  artifactsEnabled={artifactsEnabled}
                  artifactsByMessage={artifactsByMessage}
                  selectedModel={selectedModel}
                  contextUsageLabel={contextUsageLabel}
                  onFork={onFork}
                  onReprompt={onReprompt}
                  onOpenContext={onOpenContext}
                />
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
