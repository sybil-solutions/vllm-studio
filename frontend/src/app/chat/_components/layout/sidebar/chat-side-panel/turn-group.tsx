// CRITICAL
"use client";

import { useCallback, useMemo, useState } from "react";
import type { ActivityGroup } from "@/app/chat/types";
import { getTurnSummary } from "./tool-categorization";
import { ThinkingItem } from "./thinking-item";
import { ToolItem } from "./tool-item";

export function TurnGroup({ group, hasActiveThinking }: { group: ActivityGroup; hasActiveThinking: boolean }) {
  const [collapsed, setCollapsed] = useState(!group.isLatest);

  const summary = useMemo(() => getTurnSummary(group.items), [group.items]);
  const isCollapsed = group.isLatest ? false : collapsed;
  const toggleCollapsed = useCallback(() => {
    if (group.isLatest) return;
    setCollapsed((prev) => !prev);
  }, [group.isLatest]);

  return (
    <div>
      <button onClick={toggleCollapsed} className="flex items-center gap-2 py-2 pl-1 pr-2 w-full text-left group">
        <div className="w-5 h-5 rounded-full bg-[#0b0c0f] border border-white/[0.12] flex items-center justify-center z-10">
          <span className="text-[9px] text-[#9aa3b2] font-medium">{group.turnNumber || 1}</span>
        </div>
        <span className="text-[10px] text-[#8b93a5] uppercase tracking-wider">
          {group.isLatest ? "Current" : "Turn"}
        </span>
        {!group.isLatest && summary.count > 0 && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded-full"
            style={{ color: summary.color, backgroundColor: `${summary.color}15` }}
          >
            {summary.label}
          </span>
        )}
        {group.isLatest && hasActiveThinking && (
          <span className="relative flex h-1.5 w-1.5 ml-auto mr-2">
            <span className="animate-ping absolute h-full w-full rounded-full bg-[#5cf2d6] opacity-60" />
            <span className="relative h-1.5 w-1.5 rounded-full bg-[#5cf2d6]" />
          </span>
        )}
        {!group.isLatest && (
          <span className="ml-auto text-[9px] text-[#444] group-hover:text-[#666] transition-colors">
            {isCollapsed ? "+" : "−"}
          </span>
        )}
      </button>

      {!isCollapsed && (
        <div className="space-y-1">
          {group.items.map((item) =>
            item.type === "thinking" ? (
              <ThinkingItem key={item.id} content={item.content} isActive={item.isActive} />
            ) : (
              <ToolItem key={item.id} item={item} />
            ),
          )}
        </div>
      )}
    </div>
  );
}

