// CRITICAL
"use client";

import { useCallback, useEffect, useRef } from "react";
import type { SidebarTab } from "../../sidebar/unified-sidebar";

export interface UseChatSidebarControllerArgs {
  currentSessionId: string | null;
  sessionFromUrl: string | null;
  activityPanelVisible: boolean;
  thinkingActive: boolean;
  isLoading: boolean;
  executingToolsSize: number;
  activityGroupsLength: number;
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  setSidebarTab: (tab: SidebarTab) => void;
  selectAgentFile: (path: string | null, sessionId: string | null) => void;
}

export function useChatSidebarController({
  currentSessionId,
  sessionFromUrl,
  activityPanelVisible,
  thinkingActive,
  isLoading,
  executingToolsSize,
  activityGroupsLength,
  sidebarOpen,
  setSidebarOpen,
  setSidebarTab,
  selectAgentFile,
}: UseChatSidebarControllerArgs) {
  const autoOpenedActivityRef = useRef(false);

  useEffect(() => {
    autoOpenedActivityRef.current = false;
  }, [currentSessionId]);

  // Auto-open activity panel only on first activity (not every change)
  const hadActivityRef = useRef(false);
  const hasActivity =
    (activityPanelVisible ? thinkingActive : isLoading) ||
    executingToolsSize > 0 ||
    activityGroupsLength > 0;

  useEffect(() => {
    // Only trigger on transition from no-activity to has-activity
    if (!hasActivity) {
      hadActivityRef.current = false;
      return;
    }
    if (hadActivityRef.current) return;
    if (autoOpenedActivityRef.current) return;
    if (sidebarOpen) return;
    // Mobile: never auto-open (it becomes a bottom drawer and would cover the composer).
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      hadActivityRef.current = true;
      return;
    }

    hadActivityRef.current = true;
    setSidebarOpen(true);
    setSidebarTab("activity");
    autoOpenedActivityRef.current = true;
  }, [hasActivity, sidebarOpen, setSidebarOpen, setSidebarTab]);

  const openActivityPanel = useCallback(() => {
    setSidebarOpen(true);
    setSidebarTab("activity");
  }, [setSidebarOpen, setSidebarTab]);

  const openContextPanel = useCallback(() => {
    setSidebarOpen(true);
    setSidebarTab("context");
  }, [setSidebarOpen, setSidebarTab]);

  const handleOpenAgentFile = useCallback(
    (path: string) => {
      setSidebarOpen(true);
      setSidebarTab("files");
      selectAgentFile(path, sessionFromUrl || currentSessionId);
    },
    [currentSessionId, selectAgentFile, sessionFromUrl, setSidebarOpen, setSidebarTab],
  );

  return { openActivityPanel, openContextPanel, handleOpenAgentFile };
}
