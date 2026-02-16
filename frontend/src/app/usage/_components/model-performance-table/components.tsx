// CRITICAL
"use client";

import type { ReactNode } from "react";
import type { SortDirection, SortField } from "@/lib/types";
import { formatDuration } from "@/lib/formatters";

export function SortHeader({
  field,
  currentField,
  direction,
  onClick,
  children,
  align = "left",
}: {
  field: SortField;
  currentField: SortField;
  direction: SortDirection;
  onClick: () => void;
  children: ReactNode;
  align?: "left" | "right";
}) {
  const isActive = currentField === field;

  return (
    <th
      className={`py-3 px-3 sm:px-4 text-xs text-(--dim) font-normal cursor-pointer hover:text-(--fg) transition-colors select-none ${
        align === "right" ? "text-right" : "text-left"
      }`}
      onClick={onClick}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        {children}
        {isActive && <span>{direction === "asc" ? "↑" : "↓"}</span>}
      </div>
    </th>
  );
}

export function StatusPill({ value, type }: { value: number; type: "success" | "latency" }) {
  const getColor = () => {
    if (type === "success") {
      if (value >= 95) return "text-(--hl2)";
      if (value >= 90) return "text-(--hl3)";
      return "text-(--err)";
    }
    if (value < 500) return "text-(--hl2)";
    if (value < 1500) return "text-(--hl3)";
    return "text-(--err)";
  };

  return <span className={`text-sm tabular-nums ${getColor()}`}>{type === "success" ? `${value.toFixed(1)}%` : formatDuration(value)}</span>;
}

