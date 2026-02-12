"use client";

import * as Icons from "../../icons";
import { TOOL_PENDING_STATES, type ToolPart } from "./constants";

export function InlineToolIndicator({ toolParts }: { toolParts: ToolPart[] }) {
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

