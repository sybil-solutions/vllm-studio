// CRITICAL
"use client";

import { memo, useCallback, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { safeJsonStringify } from "@/lib/safe-json";
import type { ActivityItem } from "@/app/chat/types";
import { CATEGORY_META, categorize, type ToolCategory } from "./tool-categorization";

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

export const ToolItem = memo(
  function ToolItem({ item }: ToolItemProps) {
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
      <div className="relative pl-7 pr-2 py-2 bg-(--surface) rounded border-b border-(--border) hover:bg-(--surface) transition-colors">
        <div
          className="absolute left-1.75 top-3 w-2.25 h-2.25 rounded-full border flex items-center justify-center"
          style={{
            borderColor: isExecuting ? "var(--hl2)" : isError ? "var(--err)" : hasResult ? "var(--hl1)" : "var(--border)",
            backgroundColor: "var(--surface)",
          }}
        >
          {isExecuting && <div className="w-1 h-1 rounded-full bg-(--dim) animate-pulse" />}
          {isError && <div className="w-1 h-1 rounded-full bg-(--err)" />}
          {hasResult && !isError && <div className="w-1 h-1 rounded-full bg-(--hl2)" />}
        </div>

        <button onClick={toggleExpanded} className="flex items-center gap-2 w-full text-left group">
          {isExecuting ? (
            <Loader2 className="h-3 w-3 animate-spin shrink-0" style={{ color: meta.iconColor }} />
          ) : (
            <CategoryIcon category={category} className="h-3 w-3 shrink-0" />
          )}
          <span
            className={`text-[11px] truncate ${
              isExecuting ? "text-(--hl1)" : isError ? "text-(--err)" : hasResult ? "text-(--hl2)" : "text-(--fg)"
            }`}
          >
            {toolName}
          </span>
          {isComplete && !isError && <span className="text-[10px] text-(--hl2)">✓</span>}
          {isError && <span className="text-[10px] text-(--err)">✗</span>}
          <span className="ml-auto text-[9px] text-(--dim)">{expanded ? "−" : "+"}</span>
        </button>

        {mainArg && <p className="mt-1 text-[10px] text-(--fg) line-clamp-1 pl-5">{mainArg.slice(0, 100)}</p>}

        {expanded && (
          <div className="mt-2 space-y-2 pl-5">
            {item.input != null && (
              <div className="text-[10px] text-(--dim)">
                <span className="text-(--dim)">Input:</span>
                <pre className="mt-1 p-1.5 bg-(--surface) rounded overflow-x-auto max-h-20 overflow-y-auto text-[9px] font-mono">
                  {String(safeJsonStringify(item.input, ""))}
                </pre>
              </div>
            )}
            {outputText && (
              <div className="text-[10px] text-(--dim)">
                <span className="text-(--dim)">Output:</span>
                <pre
                  className={`mt-1 p-1.5 rounded overflow-x-auto max-h-32 overflow-y-auto text-[9px] font-mono ${
                    isError ? "bg-(--surface) text-(--err)" : "bg-(--surface) text-(--fg)"
                  }`}
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
  },
);

function CategoryIcon({ category, className }: { category: ToolCategory; className?: string }) {
  const color = CATEGORY_META[category].iconColor;
  switch (category) {
    case "file":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
          <path d="M14 2v4a2 2 0 0 0 2 2h4" />
        </svg>
      );
    case "search":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "plan":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      );
    case "web":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case "code":
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    default:
      return (
        <svg
          className={className}
          viewBox="0 0 24 24"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
        </svg>
      );
  }
}
