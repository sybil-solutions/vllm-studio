// CRITICAL
"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { safeJsonStringify } from "@/lib/safe-json";
import type { ActivityGroup, ActivityItem } from "../../types";
export { ContextPanel } from "./chat-side-panel-context";
export type { ContextPanelProps } from "./chat-side-panel-context";

type ToolCategory = "file" | "search" | "plan" | "web" | "code" | "other";

const TOOL_CATEGORIES: Record<string, ToolCategory> = {
  read_file: "file",
  write_file: "file",
  list_files: "file",
  delete_file: "file",
  make_directory: "file",
  move_file: "file",
  create_file: "file",
  edit_file: "file",
  search: "search",
  grep: "search",
  find: "search",
  ripgrep: "search",
  semantic_search: "search",
  plan: "plan",
  update_plan: "plan",
  create_plan: "plan",
  web_search: "web",
  fetch_url: "web",
  browse: "web",
  http_request: "web",
  execute_code: "code",
  run_command: "code",
  bash: "code",
  python: "code",
  shell: "code",
};

const categorize = (toolName?: string): ToolCategory => {
  if (!toolName) return "other";
  const lower = toolName.toLowerCase();
  for (const [pattern, category] of Object.entries(TOOL_CATEGORIES)) {
    if (lower === pattern || lower.includes(pattern)) return category;
  }
  if (lower.includes("file") || lower.includes("directory") || lower.includes("folder")) return "file";
  if (lower.includes("search") || lower.includes("find") || lower.includes("grep")) return "search";
  if (lower.includes("web") || lower.includes("fetch") || lower.includes("http") || lower.includes("url")) return "web";
  if (lower.includes("exec") || lower.includes("run") || lower.includes("shell") || lower.includes("bash") || lower.includes("command")) return "code";
  return "other";
};

const CATEGORY_META: Record<ToolCategory, { label: string; color: string; iconColor: string }> = {
  file: { label: "File ops", color: "#6aa2ff", iconColor: "#6aa2ff" },
  search: { label: "Search", color: "#c084fc", iconColor: "#c084fc" },
  plan: { label: "Planning", color: "#32f2c2", iconColor: "#32f2c2" },
  web: { label: "Web", color: "#fb923c", iconColor: "#fb923c" },
  code: { label: "Code", color: "#facc15", iconColor: "#facc15" },
  other: { label: "Tools", color: "#8b93a5", iconColor: "#8b93a5" },
};

const getTurnSummary = (items: ActivityItem[]): { label: string; count: number; color: string } => {
  const toolItems = items.filter((i) => i.type !== "thinking");
  if (toolItems.length === 0) return { label: "Thinking", count: 0, color: "#8b93a5" };
  const counts = new Map<ToolCategory, number>();
  for (const item of toolItems) {
    const cat = categorize(item.toolName);
    counts.set(cat, (counts.get(cat) ?? 0) + 1);
  }
  let dominant: ToolCategory = "other";
  let max = 0;
  for (const [cat, count] of counts) {
    if (count > max) {
      dominant = cat;
      max = count;
    }
  }
  const meta = CATEGORY_META[dominant];
  return { label: `${meta.label} (${toolItems.length})`, count: toolItems.length, color: meta.color };
};

export interface ActivityPanelProps {
  activityGroups: ActivityGroup[];
  agentPlan?: { steps: Array<{ status: string; title: string }> } | null;
  isLoading?: boolean;
}

export function ActivityPanel({ activityGroups, agentPlan, isLoading }: ActivityPanelProps) {
  if (activityGroups.length === 0) {
    return <div className="py-8 text-center text-sm text-[#8a93a5]">No activity yet</div>;
  }

  const totalSteps = agentPlan?.steps.length ?? 0;
  const doneSteps = agentPlan?.steps.filter((s) => s.status === "done").length ?? 0;
  const currentStep = agentPlan?.steps.find((s) => s.status === "running");
  const hasIncomplete = doneSteps < totalSteps;

  const latestGroup = activityGroups[0];
  const hasActiveThinking = latestGroup?.items.some((i) => i.type === "thinking" && i.isActive);

  return (
    <div className="h-full flex flex-col bg-[radial-gradient(140%_70%_at_12%_-10%,rgba(45,255,199,0.08),transparent_55%),radial-gradient(130%_80%_at_90%_-20%,rgba(108,140,255,0.12),transparent_60%),linear-gradient(180deg,#07080a,rgba(4,4,6,0.98))]">
      {totalSteps > 0 && (
        <div className="px-3 py-3 border-b border-white/[0.08] mb-2 bg-[#08090b]/90">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-[#9aa3b2]">Plan Progress</span>
            <span className="text-[10px] text-[#6f7785] font-mono">
              {doneSteps}/{totalSteps}
            </span>
          </div>
          <div className="h-1 w-full rounded-full bg-[#101114] overflow-hidden">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#32f2c2,#6aa2ff)] transition-all duration-300"
              style={{ width: `${totalSteps > 0 ? (doneSteps / totalSteps) * 100 : 0}%` }}
            />
          </div>
          {currentStep && isLoading && (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="h-3 w-3 text-[#7aa6ff] animate-spin" />
              <span className="text-[11px] text-[#9aa3b2] truncate">{currentStep.title}</span>
            </div>
          )}
          {!currentStep && hasIncomplete && isLoading && (
            <div className="flex items-center gap-2 mt-2">
              <Loader2 className="h-3 w-3 text-[#7aa6ff] animate-spin" />
              <span className="text-[11px] text-[#9aa3b2]">Working...</span>
            </div>
          )}
        </div>
      )}

      <div className="relative flex-1 overflow-y-auto px-2">
        <div className="absolute left-4.75 top-2 bottom-2 w-px bg-white/[0.08]" />

        <div className="space-y-1 pb-4">
          {activityGroups.map((group) => (
            <TurnGroup
              // Remount when a group transitions to/from the latest turn so internal collapsed
              // state re-initializes without an effect-driven setState.
              key={`${group.id}:${group.isLatest ? "latest" : "past"}`}
              group={group}
              hasActiveThinking={group.isLatest && !!hasActiveThinking}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function TurnGroup({
  group,
  hasActiveThinking,
}: {
  group: ActivityGroup;
  hasActiveThinking: boolean;
}) {
  const [collapsed, setCollapsed] = useState(!group.isLatest);

  const summary = useMemo(() => getTurnSummary(group.items), [group.items]);
  const isCollapsed = group.isLatest ? false : collapsed;
  const toggleCollapsed = useCallback(() => {
    if (group.isLatest) return;
    setCollapsed((prev) => !prev);
  }, [group.isLatest]);

  return (
    <div>
      <button
        onClick={toggleCollapsed}
        className="flex items-center gap-2 py-2 pl-1 pr-2 w-full text-left group"
      >
        <div className="w-5 h-5 rounded-full bg-[#0b0c0f] border border-white/[0.12] flex items-center justify-center z-10">
          <span className="text-[9px] text-[#9aa3b2] font-medium">
            {group.turnNumber || 1}
          </span>
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

const ThinkingItem = memo(function ThinkingItem({
  content,
  isActive,
}: {
  content?: string;
  isActive?: boolean;
}) {
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

      <button
        onClick={toggleExpanded}
        className="flex items-center gap-2 w-full text-left group"
      >
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
        {content && (
          <span className="ml-auto text-[9px] text-[#6f7785]">{expanded ? "−" : "+"}</span>
        )}
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
});

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

interface ToolItemProps {
  item: ActivityItem;
}

function getToolDisplayName(name?: string) {
  if (!name) return "Tool";
  const cleanName = name.includes("__") ? name.split("__").slice(1).join("__") : name;
  return cleanName
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function getMainArg(input?: unknown): string | undefined {
  if (input == null) return undefined;
  if (typeof input === "string") return input;
  if (typeof input === "object") {
    const record = input as Record<string, unknown>;
    const candidate =
      record.query ?? record.url ?? record.text ?? record.input ?? record.path ?? record.command;
    return candidate != null ? String(candidate) : undefined;
  }
  return undefined;
}

function formatToolOutput(output?: unknown): string {
  if (!output) return "";
  if (typeof output === "string") return output;
  return safeJsonStringify(output, "");
}

const ToolItem = memo(function ToolItem({ item }: ToolItemProps) {
  const [expanded, setExpanded] = useState(false);
  const isExecuting = item.state === "running";
  const isComplete = item.state === "complete";
  const hasResult = item.output != null;
  const isError = item.state === "error";
  const category = useMemo(() => categorize(item.toolName), [item.toolName]);
  const meta = CATEGORY_META[category];

  const toggleExpanded = useCallback(() => setExpanded((prev) => !prev), []);

  const mainArg = useMemo(() => getMainArg(item.input), [item.input]);
  const toolName = useMemo(() => getToolDisplayName(item.toolName), [item.toolName]);
  const outputText = useMemo(() => {
    if (!expanded) return "";
    return formatToolOutput(item.output);
  }, [expanded, item.output]);

  return (
    <div className="relative pl-7 pr-2 py-2 bg-white/1 rounded hover:bg-white/2 transition-colors">
      <div
        className="absolute left-1.75 top-3 w-2.25 h-2.25 rounded-full border flex items-center justify-center"
        style={{
          borderColor: isExecuting ? "#444" : isError ? "#522" : hasResult ? "#353" : "#333",
          backgroundColor: "#1c1b1a",
        }}
      >
        {isExecuting && <div className="w-1 h-1 rounded-full bg-[#666] animate-pulse" />}
        {isError && <div className="w-1 h-1 rounded-full bg-[#633]" />}
        {hasResult && !isError && <div className="w-1 h-1 rounded-full bg-[#464]" />}
      </div>

      <button
        onClick={toggleExpanded}
        className="flex items-center gap-2 w-full text-left group"
      >
        {isExecuting ? (
          <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: meta.iconColor }} />
        ) : (
          <CategoryIcon category={category} className="h-3 w-3 shrink-0" />
        )}
        <span
          className={`text-[11px] truncate ${isExecuting ? "text-[#777]" : isError ? "text-[#755]" : hasResult ? "text-[#797]" : "text-[#555]"}`}
        >
          {toolName}
        </span>
        {/* State badge */}
        {isComplete && !isError && (
          <span className="text-[10px] text-[#4a7]">✓</span>
        )}
        {isError && (
          <span className="text-[10px] text-[#a54]">✗</span>
        )}
        <span className="ml-auto text-[9px] text-[#333]">{expanded ? "−" : "+"}</span>
      </button>

      {mainArg && (
        <p className="mt-1 text-[10px] text-[#444] line-clamp-1 pl-5">{mainArg.slice(0, 100)}</p>
      )}

      {expanded && (
        <div className="mt-2 space-y-2 pl-5">
          {item.input != null && (
            <div className="text-[10px] text-[#333]">
              <span className="text-[#444]">Input:</span>
              <pre className="mt-1 p-1.5 bg-[#252321] rounded overflow-x-auto max-h-20 overflow-y-auto text-[9px] font-mono">
                {String(safeJsonStringify(item.input, ""))}
              </pre>
            </div>
          )}
          {outputText && (
            <div className="text-[10px] text-[#333]">
              <span className="text-[#444]">Output:</span>
              <pre
                className={`mt-1 p-1.5 rounded overflow-x-auto max-h-32 overflow-y-auto text-[9px] font-mono ${isError ? "bg-[#2a1f1f] text-[#755]" : "bg-[#252321] text-[#555]"}`}
              >
                {outputText.slice(0, 500)}
                {outputText.length > 500 ? "..." : ""}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
},
function areToolItemPropsEqual(prev, next) {
  const a = prev.item;
  const b = next.item;
  return (
    a.id === b.id &&
    a.type === b.type &&
    a.toolName === b.toolName &&
    a.state === b.state &&
    a.isActive === b.isActive &&
    a.content === b.content &&
    a.input === b.input &&
    a.output === b.output
  );
});

function CategoryIcon({ category, className }: { category: ToolCategory; className?: string }) {
  const color = CATEGORY_META[category].iconColor;
  switch (category) {
    case "file":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "plan":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9" /><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "web":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "code":
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
        </svg>
      );
    default:
      return (
        <svg className={className} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
  }
}
