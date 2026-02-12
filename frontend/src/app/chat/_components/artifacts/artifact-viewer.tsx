// CRITICAL
"use client";

import {
  useRef,
  useEffect,
  useCallback,
  useMemo,
  useState,
  type WheelEvent as ReactWheelEvent,
} from "react";
import { Code, FileCode, Palette } from "lucide-react";
import type { Artifact } from "@/lib/types";
import { useAppStore } from "@/store";
import { DEFAULT_ARTIFACT_VIEWER_ENTRY } from "@/store/chat-slice-defaults";
import {
  buildSvgDocument,
  buildReactDocument,
  buildJsDocument,
  buildHtmlDocument,
  buildTextDocument,
} from "./artifact-templates";
import { ArtifactViewerContent } from "./artifact-viewer-content";
import { useArtifactDrag } from "./artifact-viewer/use-artifact-drag";

interface ArtifactViewerProps {
  artifact: Artifact;
  isActive?: boolean;
}

export function ArtifactViewer({ artifact, isActive = true }: ArtifactViewerProps) {
  type ViewerEntry = typeof DEFAULT_ARTIFACT_VIEWER_ENTRY;

  const viewerState = useAppStore(
    (state) =>
      state.artifactViewerState[artifact.id] ?? DEFAULT_ARTIFACT_VIEWER_ENTRY,
  );
  const updateArtifactViewerState = useAppStore((state) => state.updateArtifactViewerState);
  const { isFullscreen, showCode, copied, scale, position, isRunning, error } = viewerState;
  const patchState = useCallback(
    (partial: Partial<ViewerEntry>) => {
      updateArtifactViewerState(artifact.id, (prev) => ({ ...prev, ...partial }));
    },
    [artifact.id, updateArtifactViewerState],
  );

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const srcDoc = useMemo(() => {
    switch (artifact.type) {
      case "svg": {
        const svgMarkup = artifact.code.includes("<svg")
          ? artifact.code
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${artifact.code}</svg>`;
        // Scaling is handled by the outer transform in the viewer; keep the iframe content stable.
        return buildSvgDocument(svgMarkup);
      }
      case "react":
        return buildReactDocument(artifact.code);
      case "javascript":
        return buildJsDocument(artifact.code);
      case "html":
        return buildHtmlDocument(artifact.code);
      default:
        return buildTextDocument(artifact.code);
    }
  }, [artifact.code, artifact.type]);

  const runArtifact = useCallback(() => {
    patchState({ isRunning: true, error: null });
    if (iframeRef.current) {
      iframeRef.current.srcdoc = srcDoc;
    }
  }, [patchState, srcDoc]);

  const stopArtifact = useCallback(() => {
    patchState({ isRunning: false });
    if (iframeRef.current) {
      iframeRef.current.srcdoc = "";
    }
  }, [patchState]);

  useEffect(() => {
    if (!isActive) return;
    const timeoutId = window.setTimeout(() => {
      runArtifact();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [isActive, artifact.id, runArtifact]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "error") {
        patchState({ error: event.data.message });
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [patchState]);

  const zoomIn = useCallback(() => {
    updateArtifactViewerState(artifact.id, (prev) => ({
      ...prev,
      scale: Math.min(prev.scale + 0.25, 3),
    }));
  }, [artifact.id, updateArtifactViewerState]);

  const zoomOut = useCallback(() => {
    updateArtifactViewerState(artifact.id, (prev) => ({
      ...prev,
      scale: Math.max(prev.scale - 0.25, 0.25),
    }));
  }, [artifact.id, updateArtifactViewerState]);

  const resetView = useCallback(() => {
    updateArtifactViewerState(artifact.id, (prev) => ({
      ...prev,
      scale: 1,
      position: { x: 0, y: 0 },
    }));
  }, [artifact.id, updateArtifactViewerState]);

  const { isDragging: isDraggingLocal, dragPosition, onMouseDown: handleMouseDown } = useArtifactDrag({
    position,
    onCommitPosition: (next) => {
      updateArtifactViewerState(artifact.id, (prev) => ({ ...prev, position: next }));
    },
  });

  const handleWheel = useCallback((e: ReactWheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      updateArtifactViewerState(artifact.id, (prev) => ({
        ...prev,
        scale: Math.max(0.25, Math.min(3, prev.scale + delta)),
      }));
    }
  }, [artifact.id, updateArtifactViewerState]);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(artifact.code);
    patchState({ copied: true });
    setTimeout(() => patchState({ copied: false }), 2000);
  }, [artifact.code, patchState]);

  const handleDownload = useCallback(() => {
    const ext =
      artifact.type === "html"
        ? ".html"
        : artifact.type === "react" || artifact.type === "javascript"
          ? ".jsx"
          : artifact.type === "svg"
            ? ".svg"
            : ".txt";
    const filename =
      (artifact.title || `artifact-${artifact.id}`).replace(/[^a-z0-9]/gi, "-").toLowerCase() + ext;
    const blob = new Blob([artifact.code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifact.code, artifact.id, artifact.title, artifact.type]);

  const handleOpenExternal = useCallback(() => {
    const blob = new Blob([srcDoc], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
  }, [srcDoc]);

  const icon = useMemo(() => {
    if (artifact.type === "svg") {
      return <Palette className="h-3.5 w-3.5" />;
    }
    if (artifact.type === "html") {
      return <FileCode className="h-3.5 w-3.5" />;
    }
    return <Code className="h-3.5 w-3.5" />;
  }, [artifact.type]);

  const viewerPosition = dragPosition ?? position;

  const onToggleCode = useCallback(() => {
    patchState({ showCode: !showCode });
  }, [patchState, showCode]);

  const onEnterFullscreen = useCallback(() => {
    patchState({ isFullscreen: true });
  }, [patchState]);

  const onExitFullscreen = useCallback(() => {
    patchState({ isFullscreen: false });
  }, [patchState]);

  const viewerContentProps = {
    artifact,
    icon,
    isRunning,
    showCode,
    copied,
    error,
    onRun: runArtifact,
    onStop: stopArtifact,
    onRefresh: runArtifact,
    onToggleCode,
    onCopy: handleCopy,
    onDownload: handleDownload,
    onOpenExternal: handleOpenExternal,
    onEnterFullscreen,
    zoomIn,
    zoomOut,
    resetView,
    scale,
    isDragging: isDraggingLocal,
    position: viewerPosition,
    onMouseDown: handleMouseDown,
    onWheel: handleWheel,
    iframeRef,
    containerRef,
  };

  return (
    <>
      <div className="rounded-lg border border-(--border) overflow-hidden bg-(--card)">
        <ArtifactViewerContent {...viewerContentProps} />
      </div>

      {isFullscreen && (
        <>
          <div
            className="fixed inset-0 z-100 bg-black/80"
            onClick={onExitFullscreen}
          />
          <div className="fixed inset-3 md:inset-6 z-101 bg-(--card) rounded-xl border border-(--border) overflow-hidden flex flex-col">
            <ArtifactViewerContent
              {...viewerContentProps}
              inModal
              onClose={onExitFullscreen}
            />
          </div>
        </>
      )}
    </>
  );
}
