// CRITICAL
"use client";

import { GripVertical, PanelRightClose } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SidebarPaneProps } from "./types";
import { TabButton } from "./tab-button";

const MIN_WIDTH = 280;
const DEFAULT_MAX_WIDTH = 1000;
const DEFAULT_WIDTH = 400;

export function SidebarPane({
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
      const nextWidth = Math.min(maxWidth, Math.max(MIN_WIDTH, resizeRef.current.startWidth + delta));
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

        <div
          className={`absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 group flex items-center justify-center ${
            isResizing ? "bg-violet-500/30" : "hover:bg-violet-500/20"
          }`}
          onMouseDown={handleResizeStart}
        >
          <div
            className={`absolute left-0 w-4 h-12 flex items-center justify-center rounded-r transition-opacity ${
              isResizing ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            <GripVertical className="h-4 w-4 text-violet-400/50" />
          </div>
        </div>

        <div className="relative flex items-center justify-between px-3 py-2 border-b border-white/[0.06]">
          <div className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
            <TabButton active={activeTab === "activity"} onClick={handleSetActivity} label="Activity" />
            <TabButton active={activeTab === "context"} onClick={handleSetContext} label="Context" />
            {hasArtifacts && <TabButton active={activeTab === "artifacts"} onClick={handleSetArtifacts} label="Preview" />}
            <div className="w-px h-4 bg-white/[0.06] mx-1" />
            <TabButton active={activeTab === "files"} onClick={handleSetFiles} label="Files" accent />
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            <button onClick={onToggle} className="p-1.5 rounded hover:bg-white/[0.06] text-[#555]" title="Close sidebar">
              <PanelRightClose className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="relative flex-1 overflow-hidden">{activeContent}</div>

        <div className="relative px-3 py-2 border-t border-white/[0.06] flex items-center justify-center">
          <span className="text-[10px] text-[#555]">
            {activeTab === "files" ? "Agent Files" : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
          </span>
        </div>
      </div>

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

