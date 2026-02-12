// CRITICAL
"use client";

import { memo, useCallback, useEffect, useMemo } from "react";
import { PanelRightClose } from "lucide-react";
import type { SidebarTab } from "./unified-sidebar";

interface MobileResultsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: SidebarTab;
  onSetActiveTab: (tab: SidebarTab) => void;
  hasArtifacts: boolean;
  activityContent: React.ReactNode;
  contextContent: React.ReactNode;
  artifactsContent: React.ReactNode;
  filesContent: React.ReactNode;
}

const TAB_LABELS: Record<SidebarTab, string> = {
  activity: "Activity",
  context: "Context",
  artifacts: "Preview",
  files: "Files",
};

export const MobileResultsDrawer = memo(function MobileResultsDrawer({
  isOpen,
  onClose,
  activeTab,
  onSetActiveTab,
  hasArtifacts,
  activityContent,
  contextContent,
  artifactsContent,
  filesContent,
}: MobileResultsDrawerProps) {
  const tabs = useMemo(() => {
    const list: Array<{ id: SidebarTab; enabled: boolean }> = [
      { id: "activity", enabled: true },
      { id: "files", enabled: true },
      { id: "artifacts", enabled: hasArtifacts },
      { id: "context", enabled: true },
    ];
    return list;
  }, [hasArtifacts]);

  const handleSelect = useCallback(
    (tab: SidebarTab, enabled: boolean) => {
      if (!enabled) return;
      onSetActiveTab(tab);
    },
    [onSetActiveTab],
  );

  const content = useMemo(() => {
    switch (activeTab) {
      case "activity":
        return activityContent;
      case "files":
        return filesContent;
      case "artifacts":
        return hasArtifacts ? artifactsContent : null;
      case "context":
        return contextContent;
      default:
        return activityContent;
    }
  }, [
    activeTab,
    activityContent,
    artifactsContent,
    contextContent,
    filesContent,
    hasArtifacts,
  ]);

  // Escape to close (handy for dev, external keyboards).
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  return (
    <div className="md:hidden">
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/55 transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 right-0 bottom-0 z-50 transition-transform duration-250 ease-out ${
          isOpen ? "translate-y-0" : "translate-y-[calc(100%+16px)]"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0)" }}
      >
        <div className="mx-2 mb-2 rounded-2xl border border-white/10 bg-[#070708]/95 backdrop-blur-xl shadow-[0_-12px_40px_rgba(0,0,0,0.65)] overflow-hidden">
          {/* Grab handle + close */}
          <div className="px-3 pt-2 pb-2 border-b border-white/10 flex items-center gap-2">
            <div className="mx-auto h-1 w-10 rounded-full bg-white/10" />
            <button
              onClick={onClose}
              className="ml-auto -mr-1 p-2 rounded-lg hover:bg-white/5 text-[#777]"
              title="Close"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>

          {/* Tabs */}
          <div className="px-2 py-1.5 border-b border-white/10 flex items-center gap-1 overflow-x-auto">
            {tabs.map((t) => {
              const enabled = t.enabled;
              const isActive = activeTab === t.id && enabled;
              return (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id, enabled)}
                  disabled={!enabled}
                  className={`px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-violet-500/15 text-violet-200"
                      : enabled
                        ? "text-[#888] hover:text-[#ddd] hover:bg-white/5"
                        : "text-[#444] cursor-not-allowed"
                  }`}
                >
                  {TAB_LABELS[t.id]}
                </button>
              );
            })}
          </div>

          <div className="max-h-[72vh] overflow-hidden">
            <div className="h-[72vh] max-h-[72vh] overflow-hidden">{content}</div>
          </div>
        </div>
      </div>
    </div>
  );
});
