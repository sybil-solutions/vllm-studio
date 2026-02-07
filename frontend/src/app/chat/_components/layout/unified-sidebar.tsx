// CRITICAL
"use client";

import { memo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PanelRightClose, GripVertical } from "lucide-react";

export type SidebarTab = "activity" | "context" | "artifacts" | "files";

const MIN_WIDTH = 280;
const DEFAULT_MAX_WIDTH = 700;
const DEFAULT_WIDTH = 400;

interface UnifiedSidebarProps {
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
  width: controlledWidth,
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
        width={controlledWidth}
        onWidthChange={onWidthChange}
      />
    </div>
  );
}

const MainPane = memo(function MainPane({ children }: { children: ReactNode }) {
  return <div className="flex-1 min-w-0 flex flex-col">{children}</div>;
});

interface SidebarPaneProps {
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

function SidebarPane({
  isOpen,
  onToggle,
  activeTab,
  onSetActiveTab,
  activityContent,
  contextContent,
  artifactsContent,
  filesContent,
  hasArtifacts,
  width: controlledWidth,
  onWidthChange,
}: SidebarPaneProps) {
  const [localWidth, setLocalWidth] = useState(() => controlledWidth ?? DEFAULT_WIDTH);
  const [dragWidth, setDragWidth] = useState<number | null>(null);
  const baseWidth = controlledWidth ?? localWidth;
  const displayWidth = dragWidth ?? baseWidth;

  const widthRef = useRef<number>(displayWidth);
  useEffect(() => {
    widthRef.current = displayWidth;
  }, [displayWidth]);

  const commitWidth = useCallback(
    (nextWidth: number) => {
      widthRef.current = nextWidth;
      if (onWidthChange) onWidthChange(nextWidth);
      else setLocalWidth(nextWidth);
    },
    [onWidthChange],
  );

  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
      widthRef.current = baseWidth;
      setDragWidth(baseWidth);
      resizeRef.current = { startX: e.clientX, startWidth: baseWidth };
    },
    [baseWidth],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      const maxWidth = Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.9));
      if (widthRef.current > maxWidth) {
        if (isResizing) setDragWidth(maxWidth);
        commitWidth(maxWidth);
      }
    };
    const raf = window.requestAnimationFrame(handleResize);
    window.addEventListener("resize", handleResize);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", handleResize);
    };
  }, [commitWidth, isResizing]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      const delta = resizeRef.current.startX - e.clientX;
      const maxWidth =
        typeof window !== "undefined"
          ? Math.max(MIN_WIDTH, Math.floor(window.innerWidth * 0.9))
          : DEFAULT_MAX_WIDTH;
      const nextWidth = Math.min(
        maxWidth,
        Math.max(MIN_WIDTH, resizeRef.current.startWidth + delta),
      );
      widthRef.current = nextWidth;
      setDragWidth(nextWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setDragWidth(null);
      resizeRef.current = null;
      commitWidth(widthRef.current);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [commitWidth, isResizing]);

  const handleSetActivity = useCallback(() => onSetActiveTab("activity"), [onSetActiveTab]);
  const handleSetContext = useCallback(() => onSetActiveTab("context"), [onSetActiveTab]);
  const handleSetArtifacts = useCallback(() => onSetActiveTab("artifacts"), [onSetActiveTab]);
  const handleSetFiles = useCallback(() => onSetActiveTab("files"), [onSetActiveTab]);

  const activeContent = useMemo(() => {
    switch (activeTab) {
      case "activity":
        return activityContent;
      case "context":
        return contextContent;
      case "artifacts":
        return artifactsContent;
      case "files":
        return filesContent ?? null;
      default:
        return activityContent;
    }
  }, [activeTab, activityContent, artifactsContent, contextContent, filesContent]);

  if (!isOpen) return null;

  return (
    <>
      <div
        className="hidden md:flex shrink-0 flex-col h-full border-l border-white/[0.06] bg-[#050505] relative shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
        style={{ width: `${displayWidth}px` }}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_70%_at_10%_-10%,rgba(90,255,214,0.08),transparent_55%),radial-gradient(140%_80%_at_90%_-20%,rgba(126,141,255,0.10),transparent_60%),linear-gradient(180deg,rgba(10,10,10,0.9),rgba(4,4,4,0.9))]" />
        <div className="absolute inset-0 border-l border-white/[0.02]" />
        {/* Resize handle */}
        <div
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group flex items-center justify-center
            ${isResizing ? "bg-violet-500/30" : "hover:bg-violet-500/20"}`}
          onMouseDown={handleResizeStart}
        >
          <div
            className={`absolute left-0 w-4 h-12 flex items-center justify-center rounded-r transition-opacity
              ${isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
          >
            <GripVertical className="h-4 w-4 text-violet-400/50" />
          </div>
        </div>

        {/* Header */}
        <div className="relative flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            <TabButton active={activeTab === "activity"} onClick={handleSetActivity} label="Activity" />
            <TabButton active={activeTab === "context"} onClick={handleSetContext} label="Context" />
            {hasArtifacts && (
              <TabButton
                active={activeTab === "artifacts"}
                onClick={handleSetArtifacts}
                label="Preview"
              />
            )}
            <div className="w-px h-4 bg-white/[0.06] mx-1" />
            <TabButton active={activeTab === "files"} onClick={handleSetFiles} label="Files" accent />
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button
              onClick={onToggle}
              className="p-1.5 rounded hover:bg-white/[0.06] text-[#555]"
              title="Close sidebar"
            >
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden">{activeContent}</div>

        {/* Footer */}
        <div className="relative px-3 py-2 border-t border-white/[0.06] flex items-center justify-center">
          <span className="text-[10px] text-[#555]">
            {activeTab === "files"
              ? "Agent Files"
              : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </span>
        </div>
      </div>

      {/* Global resize cursor when dragging */}
      {isResizing && (
        <style jsx global>{`
          body {
            cursor: col-resize !important;
            user-select: none !important;
          }
        `}</style>
      )}
    </>
  );
}

const TabButton = memo(function TabButton({
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
});
