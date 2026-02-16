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
              ? "bg-(--hl2)/15 text-(--hl2)"
              : "bg-(--surface) text-(--fg)"
            : accent
              ? "text-(--hl2)/70 hover:text-(--hl2) hover:bg-(--surface)"
              : "text-(--dim) hover:text-(--fg) hover:bg-(--surface)"
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
