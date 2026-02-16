"use client";

/**
 * Configuration row display - shows a label with a value and optional icon
 * Used in config-style UI displays
 */
import type { ReactNode } from "react";

interface ConfigRowOptions {
  label: string;
  value: string;
  icon?: ReactNode;
  truncate?: boolean;
  accent?: boolean;
}

function ConfigRow({ label, value, icon, truncate = false, accent = false }: ConfigRowOptions) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-center gap-2 text-(--dim) text-sm min-w-0 shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={`text-xs sm:text-sm font-mono ${accent ? "text-(--hl2)" : "text-(--fg)"} ${truncate ? "truncate" : ""} text-right flex-1`}
      >
        {value}
      </span>
    </div>
  );
}

export { ConfigRow };
