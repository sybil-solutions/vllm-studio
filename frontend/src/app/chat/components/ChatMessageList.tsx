'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import Image from 'next/image';
import { AlertCircle, Copy, Check, Bookmark, BookmarkCheck, GitBranch } from 'lucide-react';
import { MessageRenderer, splitThinking } from '@/components/chat/message-renderer';
import { normalizeAssistantMarkdownForRender } from '@/lib/chat-markdown';

interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string | null;
  model?: string | null;
  images?: string[];
  toolCalls?: Array<{
    id: string;
    type: string;
    function: { name: string; arguments: string };
  }>;
  toolResults?: Array<{
    tool_call_id: string;
    content: string;
    isError?: boolean;
  }>;
  isStreaming?: boolean;
  createdAt?: string;
}

export type ChatMessage = Message;

interface ChatMessageListProps {
  messages: Message[];
  currentSessionId?: string | null;
  bookmarkedMessages: Set<string>;
  artifactsEnabled: boolean;
  isLoading: boolean;
  error: string | null;
  copiedIndex: number | null;
  onCopy: (text: string, index: number) => void;
  onFork: (messageId: string) => void;
  onToggleBookmark: (messageId: string) => void;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-2 h-2 rounded-full bg-[var(--success)] animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  );
}

export function ChatMessageList({
  messages,
  currentSessionId,
  bookmarkedMessages,
  artifactsEnabled,
  isLoading,
  error,
  copiedIndex,
  onCopy,
  onFork,
  onToggleBookmark,
}: ChatMessageListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const normalizedMessages = useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      content: msg.role === 'assistant' && msg.content
        ? normalizeAssistantMarkdownForRender(msg.content)
        : msg.content,
    }));
  }, [messages]);

  const visibleMessages = useMemo(() => {
    return normalizedMessages.filter((msg) => {
      if (msg.role !== 'assistant') return true;
      if (msg.isStreaming) return true;
      const rawContent = msg.content ?? '';
      if (!rawContent.trim()) return false;
      const { mainContent } = splitThinking(rawContent);
      return mainContent.trim().length > 0;
    });
  }, [normalizedMessages]);

  const lastAssistantMessage = useMemo(() => {
    return [...visibleMessages].reverse().find((m) => m.role === 'assistant');
  }, [visibleMessages]);

  const handleCopy = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      onCopy(text, index);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-[#e8e4dd] mb-2">Error Loading Messages</h3>
        <p className="text-sm text-[#9a9590] max-w-md">{error}</p>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return <div className="flex-1" />;
  }

  return (
    <div className="flex-1 flex flex-col min-w-0">
      <div className="flex-1 flex flex-col">
        {visibleMessages.map((message, index) => (
          <MessageItem
            key={message.id}
            message={message}
            index={index}
            currentSessionId={currentSessionId || null}
            artifactsEnabled={artifactsEnabled}
            onCopy={handleCopy}
            onFork={onFork}
            onToggleBookmark={onToggleBookmark}
            bookmarked={bookmarkedMessages.has(message.id)}
            showCopied={showCopied && index === copiedIndex}
          />
        ))}
        {isLoading && !lastAssistantMessage && (
          <div className="max-w-4xl mx-auto w-full px-4 md:px-6 py-3">
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)]/40 px-4 py-3">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

interface MessageItemProps {
  message: Message;
  index: number;
  currentSessionId: string | null;
  artifactsEnabled: boolean;
  onCopy: (text: string, index: number) => void;
  onFork: (messageId: string) => void;
  onToggleBookmark: (messageId: string) => void;
  bookmarked: boolean;
  showCopied: boolean;
}

function MessageItem({
  message,
  index,
  currentSessionId,
  artifactsEnabled,
  onCopy,
  onFork,
  onToggleBookmark,
  bookmarked,
  showCopied,
}: MessageItemProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const showActions = isAssistant && message.content && !message.isStreaming;

  const content = message.content || '';

  if (isUser) {
    return (
      <div id={`message-${message.id}`} className="max-w-4xl mx-auto w-full px-4 md:px-6 py-2">
        <div className="ml-auto max-w-[75%] md:max-w-[62%] rounded-xl border border-[var(--border)] bg-[var(--card)]/70 px-3 py-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#9a9590] mb-1">You</div>
          {message.images && message.images.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {message.images.map((base64, i) => (
                <Image
                  key={i}
                  src={`data:image/jpeg;base64,${base64}`}
                  alt=""
                  width={140}
                  height={140}
                  className="max-w-[140px] max-h-[140px] rounded-lg border border-[var(--border)] h-auto w-auto"
                  unoptimized
                />
              ))}
            </div>
          )}
          <div className="prose prose-invert max-w-none">
            <p className="text-[16px] leading-relaxed text-[#e8e4dd] whitespace-pre-wrap break-words">
              {content}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isAssistant) {
    return (
      <div id={`message-${message.id}`} className="max-w-4xl mx-auto w-full px-4 md:px-6 py-2">
        <div className="relative group max-w-[88%] md:max-w-[80%] mr-auto">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[#9a9590] mb-1">Assistant</div>
          <MessageRenderer
            content={content}
            isStreaming={message.isStreaming}
            artifactsEnabled={artifactsEnabled}
            messageId={message.id}
            showActions={false}
          />
          <div
            className={`absolute right-0 -top-1 opacity-0 group-hover:opacity-100 transition-opacity ${showActions ? '' : 'hidden'}`}
          >
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => onCopy(content, index)}
                className="p-1.5 rounded-full border border-transparent hover:border-[var(--border)] text-[#8a8580] hover:text-[#c9a66b]"
                title="Copy"
                aria-label="Copy"
              >
                {showCopied ? (
                  <Check className="h-3.5 w-3.5 text-[var(--success)]" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
              <button
                onClick={() => onToggleBookmark(message.id)}
                className="p-1.5 rounded-full border border-transparent hover:border-[var(--border)] text-[#8a8580] hover:text-[#c9a66b]"
                title="Bookmark"
                aria-label="Bookmark"
              >
                {bookmarked ? (
                  <BookmarkCheck className="h-3.5 w-3.5 text-[var(--link)]" />
                ) : (
                  <Bookmark className="h-3.5 w-3.5" />
                )}
              </button>
              {currentSessionId && (
                <button
                  onClick={() => onFork(message.id)}
                  className="p-1.5 rounded-full border border-transparent hover:border-[var(--border)] text-[#8a8580] hover:text-[#c9a66b]"
                  title="Fork"
                  aria-label="Fork"
                >
                  <GitBranch className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
