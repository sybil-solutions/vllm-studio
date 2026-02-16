// CRITICAL
"use client";

import { memo, useCallback, useMemo } from "react";
import { useAppStore } from "@/store";
import * as Icons from "../icons";
import type { ChatMessage, ChatMessageMetadata } from "@/lib/types";

interface ToolCallGroupProps {
  groupId: string;
  messages: ChatMessage[];
  isStreaming?: boolean;
}

interface ToolPart {
  type: string;
  toolCallId: string;
  state?: string;
  toolName?: string;
}

const TOOL_PENDING_STATES = new Set([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
]);

function extractToolParts(message: ChatMessage): ToolPart[] {
  return message.parts
    .filter(
      (part): part is typeof part & { toolCallId: string; state?: string; toolName?: string } => {
        if (part.type === "dynamic-tool") return "toolCallId" in part;
        return (
          typeof part.type === "string" && part.type.startsWith("tool-") && "toolCallId" in part
        );
      },
    )
    .map((part) => {
      if (part.type === "dynamic-tool") {
        return { ...part, toolName: "toolName" in part ? String(part.toolName) : "tool" };
      }
      const rawName = part.type.replace(/^tool-/, "");
      const toolName = rawName.includes("__") ? rawName.split("__").slice(1).join("__") : rawName;
      return { ...part, toolName };
    });
}

function ToolCallGroupBase({ groupId, messages, isStreaming }: ToolCallGroupProps) {
  const expanded = useAppStore((state) => state.toolCallGroupsExpanded[groupId] ?? false);
  const setExpanded = useAppStore((state) => state.setToolCallGroupExpanded);

  // Aggregate tool calls from all messages
  const { totalCalls, hasError, isRunning, toolNamesPreview, moreCount, allToolParts } = useMemo(() => {
    const allToolParts: Array<{ messageId: string; toolPart: ToolPart; model?: string }> = [];
    const toolNames = new Set<string>();
    let hasError = false;
    let hasPendingCalls = false;

    for (const msg of messages) {
      const metadata = msg.metadata as ChatMessageMetadata | undefined;
      const model = metadata?.model;
      const parts = extractToolParts(msg);
      for (const part of parts) {
        allToolParts.push({ messageId: msg.id, toolPart: part, model });
        if (part.toolName) toolNames.add(part.toolName);

        if (
          part.state === "output-error" ||
          part.state === "error" ||
          part.state === "output-denied"
        ) {
          hasError = true;
        }
        if (part.state && TOOL_PENDING_STATES.has(part.state)) {
          hasPendingCalls = true;
        }
      }
    }

    const totalCalls = allToolParts.length;
    const orderedToolNames = [...toolNames];
    const toolNamesPreview = orderedToolNames.slice(0, 3).join(", ");
    const moreCount = orderedToolNames.length - 3;
    const isRunning = Boolean(isStreaming) && hasPendingCalls;

    return { totalCalls, hasError, isRunning, toolNamesPreview, moreCount, allToolParts };
  }, [isStreaming, messages]);

  const label = hasError ? "error" : isRunning ? "running" : "done";

  const handleToggleExpanded = useCallback(() => {
    setExpanded(groupId, !expanded);
  }, [expanded, groupId, setExpanded]);

  if (totalCalls === 0) return null;

  return (
    <div className="group">
      {/* Collapsed view */}
      <button
        onClick={handleToggleExpanded}
        className="flex items-center gap-2 text-xs text-(--dim) hover:text-(--dim) transition-colors w-full text-left py-1"
      >
        {isRunning ? (
          <Icons.Loader2 className="h-3 w-3 text-(--dim) animate-spin shrink-0" />
        ) : hasError ? (
          <span className="w-3 h-3 flex items-center justify-center shrink-0 text-red-400 text-[10px]">
            ✕
          </span>
        ) : (
          <Icons.Check className="h-3 w-3 text-emerald-500/70 shrink-0" />
        )}
        <span className={hasError ? "text-red-400/70" : ""}>{label}</span>
        <span className="text-(--border)">·</span>
        <span>
          {totalCalls} tool call{totalCalls !== 1 ? "s" : ""}
        </span>
        {toolNamesPreview && (
          <>
            <span className="text-(--border)">·</span>
            <span className="font-mono truncate max-w-[200px]">
              {toolNamesPreview}
              {moreCount > 0 ? ` +${moreCount}` : ""}
            </span>
          </>
        )}
        <span className="ml-auto">
          {expanded ? (
            <Icons.ChevronUp className="h-3 w-3" />
          ) : (
            <Icons.ChevronDown className="h-3 w-3" />
          )}
        </span>
      </button>

      {/* Expanded view */}
        {expanded && (
          <div className="mt-2 space-y-1 pl-5 border-l border-(--border) ml-1.5">
            {allToolParts.map(({ toolPart }, idx) => {
              const isComplete =
                toolPart.state === "output-available" ||
                toolPart.state === "result" ||
                !toolPart.state;
              const isPending = toolPart.state && TOOL_PENDING_STATES.has(toolPart.state);
              const isError =
                toolPart.state === "output-error" ||
                toolPart.state === "error" ||
                toolPart.state === "output-denied";

            return (
              <div
                key={`${toolPart.toolCallId}-${idx}`}
                className="flex items-center gap-2 text-xs text-(--dim) py-0.5"
              >
                {isPending ? (
                  <Icons.Loader2 className="h-2.5 w-2.5 text-amber-400 animate-spin shrink-0" />
                ) : isError ? (
                  <span className="w-2.5 h-2.5 flex items-center justify-center shrink-0 text-red-400 text-[8px]">
                    ✕
                  </span>
                ) : isComplete ? (
                  <Icons.Check className="h-2.5 w-2.5 text-emerald-500/70 shrink-0" />
                ) : (
                  <span className="w-2.5 h-2.5 rounded-full bg-(--dim)/50 shrink-0" />
                )}
                <span className="font-mono truncate">{toolPart.toolName}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const ToolCallGroup = memo(ToolCallGroupBase);
