import type { ReactNode } from "react";

export type SidebarTab = "activity" | "context" | "artifacts" | "files";

export interface UnifiedSidebarProps {
  children: ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  activeTab: SidebarTab;
  onSetActiveTab: (tab: SidebarTab) => void;
  activityContent: ReactNode;
  contextContent: ReactNode;
  artifactsContent: ReactNode;
  filesContent?: ReactNode;
  hasArtifacts: boolean;
  width?: number;
  onWidthChange?: (width: number) => void;
}

export interface SidebarPaneProps {
  isOpen: boolean;
  onToggle: () => void;
  activeTab: SidebarTab;
  onSetActiveTab: (tab: SidebarTab) => void;
  activityContent: ReactNode;
  contextContent: ReactNode;
  artifactsContent: ReactNode;
  filesContent?: ReactNode;
  hasArtifacts: boolean;
  width?: number;
  onWidthChange?: (width: number) => void;
}

