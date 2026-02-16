// CRITICAL
"use client";

import type { ReactNode, RefObject } from "react";
import type { MouseEvent as ReactMouseEvent, WheelEvent as ReactWheelEvent } from "react";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Maximize2,
  Move,
  Play,
  RefreshCw,
  RotateCcw,
  Square,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { Artifact } from "@/lib/types";

export interface ArtifactViewerContentProps {
  artifact: Artifact;
  icon: ReactNode;
  isRunning: boolean;
  showCode: boolean;
  copied: boolean;
  error: string | null;
  inModal?: boolean;
  onClose?: () => void;
  onRun: () => void;
  onStop: () => void;
  onRefresh: () => void;
  onToggleCode: () => void;
  onCopy: () => void;
  onDownload: () => void;
  onOpenExternal: () => void;
  onEnterFullscreen?: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  scale: number;
  isDragging: boolean;
  position: { x: number; y: number };
  onMouseDown?: (e: ReactMouseEvent) => void;
  onWheel?: (e: ReactWheelEvent) => void;
  iframeRef: RefObject<HTMLIFrameElement | null>;
  containerRef: RefObject<HTMLDivElement | null>;
}

export function ArtifactViewerContent({
  artifact,
  icon,
  isRunning,
  showCode,
  copied,
  error,
  inModal = false,
  onClose,
  onRun,
  onStop,
  onRefresh,
  onToggleCode,
  onCopy,
  onDownload,
  onOpenExternal,
  onEnterFullscreen,
  zoomIn,
  zoomOut,
  resetView,
  scale,
  isDragging,
  position,
  onMouseDown,
  onWheel,
  iframeRef,
  containerRef,
}: ArtifactViewerContentProps) {
  return (
    <div className={`flex flex-col ${inModal ? "h-full" : ""}`}>
      <div className="flex items-center justify-between px-3 py-2 bg-(--accent) border-b border-(--border) shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          {icon}
          <span className="text-xs font-medium truncate">{artifact.title || artifact.type.toUpperCase()}</span>
        </div>
        <div className="flex items-center gap-0.5">
          {isRunning ? (
            <button onClick={onStop} className="p-1.5 rounded hover:bg-background text-(--err)" title="Stop">
              <Square className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button onClick={onRun} className="p-1.5 rounded hover:bg-background text-(--hl2)" title="Run">
              <Play className="h-3.5 w-3.5" />
            </button>
          )}
          <button onClick={onRefresh} className="p-1.5 rounded hover:bg-background" title="Refresh">
            <RefreshCw className="h-3.5 w-3.5 text-(--dim)" />
          </button>
          <button onClick={onToggleCode} className="p-1.5 rounded hover:bg-background" title={showCode ? "Hide code" : "Show code"}>
            {showCode ? <EyeOff className="h-3.5 w-3.5 text-(--dim)" /> : <Eye className="h-3.5 w-3.5 text-(--dim)" />}
          </button>
          <button onClick={onCopy} className="p-1.5 rounded hover:bg-background" title="Copy">
            {copied ? <Check className="h-3.5 w-3.5 text-(--hl2)" /> : <Copy className="h-3.5 w-3.5 text-(--dim)" />}
          </button>
          <button onClick={onDownload} className="p-1.5 rounded hover:bg-background" title="Download">
            <Download className="h-3.5 w-3.5 text-(--dim)" />
          </button>
          <button onClick={onOpenExternal} className="p-1.5 rounded hover:bg-background" title="Open in new tab">
            <ExternalLink className="h-3.5 w-3.5 text-(--dim)" />
          </button>
          {!inModal && onEnterFullscreen && (
            <button onClick={onEnterFullscreen} className="p-1.5 rounded hover:bg-background" title="Fullscreen">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
          )}
          {inModal && onClose && (
            <button onClick={onClose} className="p-1.5 rounded hover:bg-background" title="Close">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {inModal && (
        <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-background border-b border-(--border) shrink-0">
          <button onClick={zoomOut} className="p-1 rounded hover:bg-(--accent)" title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5 text-(--dim)" />
          </button>
          <span className="text-xs text-(--dim) tabular-nums w-12 text-center">{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className="p-1 rounded hover:bg-(--accent)" title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5 text-(--dim)" />
          </button>
          <div className="w-px h-4 bg-(--border) mx-1" />
          <button onClick={resetView} className="p-1 rounded hover:bg-(--accent)" title="Reset view">
            <RotateCcw className="h-3.5 w-3.5 text-(--dim)" />
          </button>
          <button className={`p-1 rounded ${isDragging ? "bg-(--accent)" : "hover:bg-(--accent)"}`} title="Pan (drag)">
            <Move className="h-3.5 w-3.5 text-(--dim)" />
          </button>
        </div>
      )}

      {showCode && (
        <pre className="p-3 text-xs bg-(--surface) overflow-auto border-b border-(--border) shrink-0 max-h-40">
          <code className="text-(--fg)">{artifact.code}</code>
        </pre>
      )}

      {error && (
        <div className="px-3 py-2 bg-(--err)/10 text-(--err) text-xs border-b border-(--border) shrink-0">{error}</div>
      )}

      <div
        ref={containerRef}
        className={`relative overflow-hidden bg-(--bg) ${inModal ? "flex-1 min-h-0" : "h-100"}`}
        style={inModal && scale !== 1 ? { cursor: isDragging ? "grabbing" : "grab" } : undefined}
        onMouseDown={inModal ? onMouseDown : undefined}
        onWheel={inModal ? onWheel : undefined}
      >
        <div
          className="w-full h-full"
          style={
            inModal
              ? {
                  transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                  transformOrigin: "center center",
                  transition: isDragging ? "none" : "transform 0.15s ease",
                }
              : undefined
          }
        >
          <iframe
            ref={iframeRef}
            className="block w-full h-full border-0"
            sandbox="allow-scripts allow-modals allow-same-origin allow-forms allow-popups"
            title={artifact.title || "Artifact Preview"}
          />
        </div>
      </div>
    </div>
  );
}

