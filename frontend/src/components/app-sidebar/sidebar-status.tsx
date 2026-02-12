"use client";

import { memo } from "react";
import { useSidebarStatus } from "@/hooks/use-sidebar-status";

export const SidebarStatus = memo(function SidebarStatus(props: { collapsed: boolean; isMobile: boolean }) {
  const { collapsed, isMobile } = props;
  const status = useSidebarStatus();

  return (
    <div className={`flex items-center gap-2 ${collapsed && !isMobile ? "" : ""}`}>
      <div
        className={`relative flex items-center justify-center ${
          status.inferenceOnline ? "text-emerald-400" : status.online ? "text-amber-400" : "text-red-400"
        }`}
      >
        <div
          className={`w-2 h-2 rounded-full ${
            status.inferenceOnline ? "bg-emerald-400" : status.online ? "bg-amber-400" : "bg-red-400"
          } ${status.inferenceOnline ? "animate-pulse" : ""}`}
        />
        {status.inferenceOnline && (
          <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-400 animate-ping opacity-30" />
        )}
      </div>
      {(!collapsed || isMobile) && <span className="text-xs text-[#a0a0a0] truncate font-medium">{status.activityLine}</span>}
    </div>
  );
});
