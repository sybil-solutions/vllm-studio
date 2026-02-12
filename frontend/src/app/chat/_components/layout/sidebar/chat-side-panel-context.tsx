// CRITICAL
"use client";

import type { CompactionEvent, ContextStats } from "@/lib/services/context-management";

export interface ContextPanelProps {
  stats?: Omit<
    ContextStats,
    "compactionHistory" | "lastCompaction" | "totalCompactions" | "totalTokensCompacted"
  > | null;
  breakdown?: {
    messages: number;
    userMessages: number;
    assistantMessages: number;
    toolCalls: number;
    userTokens: number;
    assistantTokens: number;
    thinkingTokens: number;
  } | null;
  compactionHistory: CompactionEvent[];
  compacting: boolean;
  compactionError: string | null;
  formatTokenCount?: (tokens: number) => string;
  onCompact?: () => void;
  canCompact?: boolean;
}

export function ContextPanel({
  stats,
  breakdown,
  compactionHistory,
  compacting,
  compactionError,
  formatTokenCount,
  onCompact,
  canCompact = false,
}: ContextPanelProps) {
  if (!stats || !breakdown) {
    return <div className="py-8 text-center text-sm text-[#555]">Context stats unavailable</div>;
  }

  const fmt = formatTokenCount ?? ((value: number) => value.toString());
  const utilizationPct = Math.round(stats.utilization * 100);
  const eightyPercentMax = Math.floor(stats.maxContext * 0.8);
  const isOverEighty = stats.currentTokens > eightyPercentMax;
  const headroom = Math.max(0, stats.maxContext - stats.currentTokens);
  const recentCompactions = compactionHistory.slice(-3).reverse();
  const lastCompaction = compactionHistory[compactionHistory.length - 1];

  return (
    <div className="space-y-4 text-xs text-[#888]">
      <div className="rounded-lg border border-[#1c1b1a] bg-[#0d0d0d]/90 p-3">
        <div className="flex items-center justify-between">
          <span className="text-[#aaa]">Context Usage</span>
          <span className={`${isOverEighty ? "text-[#755]" : "text-[#666]"}`}>
            {utilizationPct}%
          </span>
        </div>
        <div className="mt-2 text-[11px] text-[#555]">
          {fmt(stats.currentTokens)} / {fmt(stats.maxContext)} tokens • headroom {fmt(headroom)}
        </div>
        <div className="mt-2 h-1.5 w-full rounded-full bg-[#252321] relative">
          <div className="absolute top-0 bottom-0 w-px bg-[#444] z-10" style={{ left: "80%" }} />
          <div
            className={`h-full rounded-full ${isOverEighty ? "bg-[#633]" : "bg-[#555]"}`}
            style={{ width: `${Math.min(100, utilizationPct)}%` }}
          />
        </div>
        <div className="mt-1 text-[9px] text-[#444] flex justify-between">
          <span>0</span>
          <span className="text-[#555]">80% limit: {fmt(eightyPercentMax)}</span>
          <span>{fmt(stats.maxContext)}</span>
        </div>
      </div>

      <div className="rounded-lg border border-[#1c1b1a] bg-[#0d0d0d]/90 p-3 space-y-2">
        <div className="text-[#aaa]">Breakdown</div>
        <div className="grid grid-cols-2 gap-2 text-[11px] text-[#555]">
          <div>Messages: {breakdown.messages}</div>
          <div>Tool calls: {breakdown.toolCalls}</div>
          <div>User tokens: {fmt(breakdown.userTokens)}</div>
          <div>Assistant tokens: {fmt(breakdown.assistantTokens)}</div>
          <div>Thinking tokens: {fmt(breakdown.thinkingTokens)}</div>
          <div>System+tools: {fmt(stats.systemPromptTokens + stats.toolsTokens)}</div>
        </div>
      </div>

      <div className="rounded-lg border border-[#1c1b1a] bg-[#0d0d0d]/90 p-3 space-y-2">
        <div className="flex items-center justify-between text-[#aaa]">
          <span>Compaction</span>
          <div className="flex items-center gap-2">
            {compacting && <span className="text-[#555]">Running…</span>}
            {onCompact && (
              <button
                onClick={onCompact}
                disabled={!canCompact || compacting}
                className="px-2 py-1 rounded border border-white/10 text-[10px] uppercase tracking-[0.2em] text-[#c8c4bd] hover:text-white hover:border-white/30 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Compact Now
              </button>
            )}
          </div>
        </div>
        {compactionError && <div className="text-[11px] text-[#633]">{compactionError}</div>}
        {lastCompaction && (
          <div className="text-[11px] text-[#555] flex items-center justify-between">
            <span>Last</span>
            <span>
              {fmt(lastCompaction.beforeTokens)} → {fmt(lastCompaction.afterTokens)} • saved{" "}
              {fmt(Math.max(0, lastCompaction.beforeTokens - lastCompaction.afterTokens))}
            </span>
          </div>
        )}
        {recentCompactions.length === 0 ? (
          <div className="text-[11px] text-[#444]">No compactions yet</div>
        ) : (
          <div className="space-y-2 text-[11px] text-[#555]">
            {recentCompactions.map((event) => (
              <div key={event.id} className="flex items-center justify-between">
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
                <span>
                  {fmt(event.beforeTokens)} → {fmt(event.afterTokens)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

