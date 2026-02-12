// CRITICAL
"use client";

import { memo } from "react";
import type { ReactNode } from "react";
import { SidebarPane } from "./unified-sidebar/sidebar-pane";
import type { UnifiedSidebarProps } from "./unified-sidebar/types";

export type { SidebarTab } from "./unified-sidebar/types";

const MainPane = memo(function MainPane({ children }: { children: ReactNode }) {
  return <div className="flex-1 min-w-0 flex flex-col">{children}</div>;
});

export function UnifiedSidebar({
  children,
  isOpen,
  onToggle,
  activeTab,
  onSetActiveTab,
  activityContent,
  contextContent,
  artifactsContent,
  filesContent,
  hasArtifacts,
  width,
  onWidthChange,
}: UnifiedSidebarProps) {
  return (
    <div className="flex h-full w-full overflow-hidden">
      <MainPane>{children}</MainPane>
      <SidebarPane
        isOpen={isOpen}
        onToggle={onToggle}
        activeTab={activeTab}
        onSetActiveTab={onSetActiveTab}
        activityContent={activityContent}
        contextContent={contextContent}
        artifactsContent={artifactsContent}
        filesContent={filesContent}
        hasArtifacts={hasArtifacts}
        width={width}
        onWidthChange={onWidthChange}
      />
    </div>
  );
}

