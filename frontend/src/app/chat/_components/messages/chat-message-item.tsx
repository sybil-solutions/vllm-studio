// CRITICAL
"use client";

import { memo, useCallback, useMemo } from "react";
import { useAppStore } from "@/store";
import * as Icons from "../icons";
import { MessageRenderer, thinkingParser } from "./message-renderer";
import { MiniArtifactCard } from "../artifacts/mini-artifact-card";
import { PerfProfiler } from "../perf/perf-profiler";
import type { Artifact, ChatMessage, ChatMessageMetadata } from "@/lib/types";

const TOOL_PENDING_STATES = new Set([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
]);

interface ChatMessageItemProps {
  message: ChatMessage;
  isStreaming: boolean;
  artifactsEnabled?: boolean;
  artifacts?: Artifact[];
  selectedModel?: string;
  contextUsageLabel?: string | null;
  onOpenContext?: () => void;
  onFork?: (messageId: string) => void;
  onReprompt?: (messageId: string) => void;
  onExport: (payload: {
    messageId: string;
    role: "user" | "assistant";
    content: string;
    model?: string;
    totalTokens?: number;
  }) => void;
}

type MessageMetadata = ChatMessageMetadata;

// Inline thinking component for mobile - minimal style
function InlineThinking({
  messageId,
  content,
  isActive,
}: {
  messageId: string;
  content: string;
  isActive: boolean;
}) {
  const expanded = useAppStore((state) => state.messageInlineThinkingExpanded[messageId] ?? false);
  const setExpanded = useAppStore((state) => state.setMessageInlineThinkingExpanded);

  if (!content && !isActive) return null;

  return (
    <div className="md:hidden mb-2">
      <button
        onClick={() => setExpanded(messageId, !expanded)}
        className="flex items-center gap-2 text-left"
      >
        {isActive ? (
          <Icons.Loader2 className="h-3 w-3 text-blue-400 animate-spin" />
        ) : (
          <Icons.Brain className="h-3 w-3 text-[#6a6560]" />
        )}
        <span className="text-xs text-[#6a6560]">{isActive ? "Thinking..." : "Reasoning"}</span>
        {content &&
          (expanded ? (
            <Icons.ChevronUp className="h-3 w-3 text-[#6a6560]" />
          ) : (
            <Icons.ChevronDown className="h-3 w-3 text-[#6a6560]" />
          ))}
      </button>
      {content && expanded && (
        <p className="mt-1 text-xs text-[#6a6560] whitespace-pre-wrap wrap-break-word max-h-40 overflow-auto pl-5">
          {content}
        </p>
      )}
    </div>
  );
}

// Inline tool calls component for mobile - minimal style
function InlineToolIndicator({
  toolParts,
}: {
  toolParts: Array<{
    type: string;
    toolCallId: string;
    state?: string;
    toolName?: string;
  }>;
}) {
  if (toolParts.length === 0) return null;

  const activeTools = toolParts.filter((t) => t.state && TOOL_PENDING_STATES.has(t.state));
  if (activeTools.length === 0) return null;

  return (
    <div className="md:hidden mb-2">
      <div className="inline-flex items-center gap-2 px-2 py-1 rounded-full border border-white/10 bg-white/5">
        <Icons.Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
        <span className="text-xs text-[#b6b1aa]">
          {activeTools.length} tool{activeTools.length > 1 ? "s" : ""} running
        </span>
      </div>
    </div>
  );
}

function ChatMessageItemBase({
  message,
  isStreaming,
  artifactsEnabled = false,
  artifacts,
  selectedModel,
  contextUsageLabel,
  onFork,
  onReprompt,
  onExport,
  onOpenContext,
}: ChatMessageItemProps) {
  const messageId = message.id;
  const messageRole = message.role;
  const messageParts = message.parts;
  const messageMetadata = message.metadata as MessageMetadata | undefined;
  const isUser = messageRole === "user";
  const runId = (messageMetadata as { runId?: string } | undefined)?.runId ?? null;
  const runDurationSeconds = useAppStore((state) => (runId ? state.runDurationsByRunId[runId] : undefined));
  const copied = useAppStore((state) => state.copiedMessageId === messageId);
  const setCopiedMessageId = useAppStore((state) => state.setCopiedMessageId);
  const setActiveArtifactId = useAppStore((state) => state.setActiveArtifactId);

  const { textContent, thinkingContent, toolParts } = useMemo(() => {
    let rawTextContent = "";
    let reasoningFromParts = "";
    const toolParts: Array<{
      type: string;
      toolCallId: string;
      state?: string;
      input?: unknown;
      output?: unknown;
      toolName?: string;
    }> = [];

    for (const part of messageParts) {
      if (part.type === "text") {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text) rawTextContent += text;
        continue;
      }
      if (part.type === "reasoning") {
        const text = (part as { text?: unknown }).text;
        if (typeof text === "string" && text) reasoningFromParts += (reasoningFromParts ? "\n" : "") + text;
        continue;
      }
      const type = (part as { type?: unknown }).type;
      const isDynamicTool = type === "dynamic-tool";
      const isStaticTool = typeof type === "string" && type.startsWith("tool-");
      if (!isDynamicTool && !isStaticTool) continue;
      if (!("toolCallId" in (part as object))) continue;

      if (isDynamicTool) {
        toolParts.push({
          ...(part as {
            type: string;
            toolCallId: string;
            state?: string;
            input?: unknown;
            output?: unknown;
            toolName?: string;
          }),
          toolName: "toolName" in (part as object) ? String((part as { toolName?: unknown }).toolName) : "tool",
        });
      } else {
        const rawName = String(type).replace(/^tool-/, "");
        const toolName = rawName.includes("__") ? rawName.split("__").slice(1).join("__") : rawName;
        toolParts.push({
          ...(part as {
            type: string;
            toolCallId: string;
            state?: string;
            input?: unknown;
            output?: unknown;
          }),
          toolName,
        });
      }
    }

    if (isUser) {
      return { textContent: rawTextContent, thinkingContent: reasoningFromParts, toolParts };
    }

    const lower = rawTextContent.toLowerCase();
    const hasThinkTags =
      lower.includes("<think") ||
      lower.includes("</think") ||
      lower.includes("<thinking") ||
      lower.includes("</thinking");
    const parsedThinking = hasThinkTags ? thinkingParser.parse(rawTextContent) : null;
    const textContent = hasThinkTags ? parsedThinking?.mainContent || "" : rawTextContent;
    const thinkingFromTags = hasThinkTags ? parsedThinking?.thinkingContent || "" : "";
    const thinkingContent = reasoningFromParts || thinkingFromTags;

    return { textContent, thinkingContent, toolParts };
  }, [isUser, messageParts]);

  const { displayModel, totalTokens } = useMemo(() => {
    const usage = messageMetadata?.usage;
    const totalTokens =
      usage?.totalTokens ??
      (usage?.inputTokens != null || usage?.outputTokens != null
        ? (usage?.inputTokens ?? 0) + (usage?.outputTokens ?? 0)
        : undefined);

    const modelLabel = messageMetadata?.model ?? selectedModel ?? "Assistant";
    const displayModel = modelLabel.split("/").pop() || modelLabel;
    return { displayModel, totalTokens };
  }, [messageMetadata, selectedModel]);

  const fullModelId = useMemo(() => {
    return (messageMetadata?.model ?? selectedModel ?? "Assistant").trim();
  }, [messageMetadata?.model, selectedModel]);

  const isThinkingActive = isStreaming && !textContent && !!thinkingContent;
  const activeToolCount = useMemo(() => {
    if (toolParts.length === 0) return 0;
    return toolParts.filter((t) => t.state && TOOL_PENDING_STATES.has(t.state)).length;
  }, [toolParts]);

  const durationLabel = useMemo(() => {
    if (typeof runDurationSeconds !== "number" || runDurationSeconds <= 0) return null;
    const mins = Math.floor(runDurationSeconds / 60);
    const secs = runDurationSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }, [runDurationSeconds]);

  const canActOnContent = textContent.trim().length > 0;

  const handleCopy = useCallback(async () => {
    if (!canActOnContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
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
  }, [canActOnContent, messageId, setCopiedMessageId, textContent]);

  const handleExport = () => {
    if (!canActOnContent) return;
    onExport({
      messageId: message.id,
      role: isUser ? "user" : "assistant",
      content: textContent,
      model: isUser ? undefined : displayModel,
      totalTokens: isUser ? undefined : totalTokens,
    });
  };

  const actionButtonClassName =
    "p-1 rounded hover:bg-(--accent) transition-colors disabled:opacity-40";

  // User message rendering - simple on mobile, card on desktop
  if (isUser) {
    return (
    <div id={`message-${message.id}`} className="group">
        {/* Mobile: simple right-aligned text */}
        <div className="md:hidden">
          <div className="text-[15px] leading-relaxed text-[#e8e4dd] whitespace-pre-wrap break-words">
            {textContent}
          </div>
        </div>

        {/* Desktop: card style */}
        <div className="hidden md:flex justify-end">
          <div className="ml-auto max-w-[62%] rounded-xl border border-(--border) bg-(--card)/70 px-3 py-2">
            <div className="flex items-center gap-2 mb-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#9a9590]">You</div>
              <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={handleCopy}
                  disabled={!canActOnContent}
                  className={actionButtonClassName}
                  title="Copy"
                >
                  {copied ? (
                    <Icons.Check className="h-3.5 w-3.5 text-(--success)" />
                  ) : (
                    <Icons.Copy className="h-3.5 w-3.5 text-[#9a9590]" />
                  )}
                </button>
                <button
                  onClick={handleExport}
                  disabled={!canActOnContent}
                  className={actionButtonClassName}
                  title="Export"
                >
                  <Icons.Download className="h-3.5 w-3.5 text-[#9a9590]" />
                </button>
              </div>
            </div>
            <div className="text-[15px] leading-relaxed text-[#e8e4dd] whitespace-pre-wrap break-words">
              {textContent}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Assistant message rendering
  return (
    <div id={`message-${message.id}`} className="flex flex-col group">
      <div className="max-w-full">
        {/* Header with model name and actions */}
        <div className="flex items-center gap-2 mb-1">
          <span
            className="md:hidden text-[10px] font-mono text-[#8a93a5] truncate max-w-[70vw]"
            title={fullModelId}
          >
            {fullModelId}
          </span>
          <span className="hidden md:inline text-[10px] uppercase tracking-wider text-[#6a6560] md:tracking-[0.2em] md:text-[#9a9590] truncate max-w-[180px]">
            {displayModel || "Assistant"}
          </span>
          {durationLabel && (
            <span className="text-[10px] text-[#6a6560] font-mono" title="Turn runtime">
              {durationLabel}
            </span>
          )}
          {activeToolCount > 0 && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#6a6560]">
              <Icons.Loader2 className="h-3 w-3 text-amber-400 animate-spin" />
              <span className="hidden md:inline">tools</span>
            </span>
          )}
          {totalTokens != null && totalTokens > 0 && (
            <span className="hidden md:inline text-[10px] text-[#6a6560] font-mono">
              {totalTokens.toLocaleString()} tok
            </span>
          )}
          {contextUsageLabel && (
            <button
              onClick={onOpenContext}
              className="hidden md:inline text-[10px] text-[#6a6560] font-mono hover:text-[#9a9590] transition-colors cursor-pointer"
            >
              ctx {contextUsageLabel}
            </button>
          )}
          {/* Desktop actions */}
          <div className="hidden md:flex ml-auto items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {onReprompt && (
                    <button
                      onClick={() => onReprompt(messageId)}
                      disabled={isStreaming}
                      className={actionButtonClassName}
                      title="Reprompt"
                    >
                      <Icons.RotateCcw className="h-3.5 w-3.5 text-[#9a9590]" />
                    </button>
                  )}
                  {onFork && (
                    <button
                      onClick={() => onFork(messageId)}
                      className={actionButtonClassName}
                      title="Fork"
                    >
                      <Icons.GitBranch className="h-3.5 w-3.5 text-[#9a9590]" />
                    </button>
            )}
            <button
              onClick={handleCopy}
              disabled={!canActOnContent}
              className={actionButtonClassName}
              title="Copy"
            >
              {copied ? (
                <Icons.Check className="h-3.5 w-3.5 text-(--success)" />
              ) : (
                <Icons.Copy className="h-3.5 w-3.5 text-[#9a9590]" />
              )}
            </button>
            <button
              onClick={handleExport}
              disabled={!canActOnContent}
              className={actionButtonClassName}
              title="Export"
            >
              <Icons.Download className="h-3.5 w-3.5 text-[#9a9590]" />
            </button>
          </div>
        </div>

        {/* Mobile inline thinking */}
        <InlineThinking
          messageId={messageId}
          content={thinkingContent}
          isActive={isThinkingActive}
        />

        {/* Mobile tool indicator (details live in Activity panel) */}
        <InlineToolIndicator toolParts={toolParts} />

        {/* Text content with MessageRenderer */}
        {textContent ? (
          <PerfProfiler id={`message-renderer:${message.id}`}>
            <MessageRenderer content={textContent} isStreaming={isStreaming} />
          </PerfProfiler>
        ) : isStreaming && !thinkingContent ? (
          <div className="flex items-center gap-2 text-[#6a6560]">
            <Icons.Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Thinking...</span>
          </div>
        ) : null}

        {artifactsEnabled && artifacts && artifacts.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {artifacts.map((artifact) => (
              <MiniArtifactCard
                key={artifact.id}
                artifact={artifact}
                onClick={() => setActiveArtifactId(artifact.id)}
              />
            ))}
          </div>
        )}

        {/* Tool telemetry stays in the Activity panel on desktop to keep the transcript clean. */}
      </div>
    </div>
  );
}

export const ChatMessageItem = memo(ChatMessageItemBase);
