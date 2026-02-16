"use client";

import { memo } from "react";
import { useSidebarStatus } from "@/hooks/use-sidebar-status";

export const MobileHeaderStatus = memo(function MobileHeaderStatus() {
  const status = useSidebarStatus();
  const text = status.activityLine;

  return (
    <>
      <div
        className={`w-1.5 h-1.5 rounded-full ${
          status.inferenceOnline ? "bg-(--hl2)" : status.online ? "bg-yellow-500" : "bg-(--err)"
        }`}
      />
      <span className="text-[11px] text-(--dim) truncate">{text}</span>
    </>
  );
});

