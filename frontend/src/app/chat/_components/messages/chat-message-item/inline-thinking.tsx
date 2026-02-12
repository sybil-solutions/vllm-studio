"use client";

import { useAppStore } from "@/store";
import * as Icons from "../../icons";

export function InlineThinking({
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

