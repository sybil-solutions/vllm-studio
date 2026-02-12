// CRITICAL
"use client";

import { memo } from "react";

export const TabButton = memo(
  function TabButton({
    active,
    onClick,
    label,
    accent,
  }: {
    active: boolean;
    onClick: () => void;
    label: string;
    accent?: boolean;
  }) {
    return (
      <button
        onClick={onClick}
        className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
          active
            ? accent
              ? "bg-violet-500/15 text-violet-300"
              : "bg-white/[0.08] text-foreground"
            : accent
              ? "text-violet-400/50 hover:text-violet-300/70 hover:bg-violet-500/5"
              : "text-[#666] hover:text-[#888] hover:bg-white/[0.03]"
        }`}
      >
        {label}
      </button>
    );
  },
  function areTabButtonPropsEqual(prev, next) {
    return (
      prev.active === next.active &&
      prev.accent === next.accent &&
      prev.label === next.label &&
      prev.onClick === next.onClick
    );
  },
);

