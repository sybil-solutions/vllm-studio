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
          status.inferenceOnline ? "bg-(--success)" : status.online ? "bg-yellow-500" : "bg-(--error)"
        }`}
      />
      <span className="text-[11px] text-[#9a9590] truncate">{text}</span>
    </>
  );
});

