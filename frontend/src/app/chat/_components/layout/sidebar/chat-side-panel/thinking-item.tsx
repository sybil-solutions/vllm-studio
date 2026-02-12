// CRITICAL
"use client";

import { memo, useCallback, useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export const ThinkingItem = memo(
  function ThinkingItem({ content, isActive }: { content?: string; isActive?: boolean }) {
    const [expanded, setExpanded] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);
    const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

    useEffect(() => {
      if (isActive && expanded && contentRef.current) {
        contentRef.current.scrollTop = contentRef.current.scrollHeight;
      }
    }, [content, isActive, expanded]);

    return (
      <div className="relative pl-7 pr-2 py-2">
        <div className="absolute left-1.75 top-2.5 w-2.25 h-2.25 rounded-full border border-white/[0.16] bg-[#111217] flex items-center justify-center">
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#5cf2d6] animate-pulse" />}
        </div>

        <button onClick={toggleExpanded} className="flex items-center gap-2 w-full text-left group">
          {isActive ? (
            <Loader2 className="h-3 w-3 text-[#7aa6ff] animate-spin shrink-0" />
          ) : (
            <BrainIcon className="h-3 w-3 text-[#8b93a5] shrink-0" />
          )}
          <span
            className={`text-[11px] ${isActive ? "text-[#b8c3d8]" : "text-[#9aa3b2]"} group-hover:text-[#d1d9e8] transition-colors`}
          >
            {isActive ? "Thinking..." : "Thought"}
          </span>
          {content && <span className="ml-auto text-[9px] text-[#6f7785]">{expanded ? "−" : "+"}</span>}
        </button>

        {expanded && content && (
          <div
            ref={contentRef}
            className="mt-2 max-h-50 overflow-y-auto text-[11px] leading-relaxed text-[#9aa3b2] whitespace-pre-wrap wrap-break-word scrollbar-thin"
          >
            {content}
          </div>
        )}
      </div>
    );
  },
  function areThinkingItemPropsEqual(prev, next) {
    return prev.content === next.content && prev.isActive === next.isActive;
  },
);

function BrainIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
    </svg>
  );
}

