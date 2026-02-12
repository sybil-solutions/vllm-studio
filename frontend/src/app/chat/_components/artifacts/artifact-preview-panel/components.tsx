// CRITICAL
"use client";

import { useMemo, useRef } from "react";
import * as Icons from "../../icons";
import type { Artifact } from "@/lib/types";
import {
  buildHtmlDocument,
  buildJsDocument,
  buildReactDocument,
  buildSvgDocument,
  buildTextDocument,
} from "../artifact-templates";

export interface ArtifactGroup {
  id: string;
  label: string;
  artifacts: Artifact[];
  lastIndex: number;
}

export function ArtifactGroupPill({
  group,
  isSelected,
  onClick,
}: {
  group: ArtifactGroup;
  isSelected: boolean;
  onClick: () => void;
}) {
  const latestVersion = group.artifacts[group.artifacts.length - 1]?.version;

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] whitespace-nowrap transition-colors shrink-0 ${
        isSelected
          ? "bg-white/8 text-foreground border border-white/8"
          : "bg-transparent text-[#666] hover:bg-white/4 border border-transparent"
      }`}
    >
      <ArtifactTypeIcon type={group.artifacts[0]?.type ?? "html"} className="h-3 w-3" />
      <span className="max-w-30 truncate">{group.label}</span>
      {latestVersion && (
        <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-1.5 py-0.5 text-[9px] text-violet-300">
          v{latestVersion}
        </span>
      )}
    </button>
  );
}

export function ArtifactVersionPill({
  artifact,
  isSelected,
  onClick,
}: {
  artifact: Artifact;
  isSelected: boolean;
  onClick: () => void;
}) {
  const versionLabel = artifact.version ? `v${artifact.version}` : "v1";

  return (
    <button
      onClick={onClick}
      className={`px-2 py-1 rounded-md text-[10px] font-mono transition-colors ${
        isSelected
          ? "bg-violet-500/15 text-violet-300 border border-violet-500/30"
          : "bg-white/2 text-[#666] hover:text-[#888] border border-white/5"
      }`}
    >
      {versionLabel}
    </button>
  );
}

export function ArtifactTypeIcon({
  type,
  className = "h-4 w-4",
}: {
  type: Artifact["type"];
  className?: string;
}) {
  switch (type) {
    case "svg":
      return <Icons.Palette className={`${className} text-pink-400`} />;
    case "html":
      return <Icons.FileCode className={`${className} text-blue-400`} />;
    case "react":
      return <Icons.Code className={`${className} text-cyan-400`} />;
    case "javascript":
      return <Icons.Code className={`${className} text-yellow-400`} />;
    default:
      return <Icons.Code className={`${className} text-[#666]`} />;
  }
}

export function ArtifactPreviewIframe({ artifact, isPlaying }: { artifact: Artifact; isPlaying: boolean }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const srcDoc = useMemo(() => {
    if (!isPlaying) return buildTextDocument("");

    switch (artifact.type) {
      case "svg": {
        const svgCode = artifact.code.includes("<svg")
          ? artifact.code
          : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${artifact.code}</svg>`;
        return buildSvgDocument(svgCode, 1);
      }
      case "html":
        return buildHtmlDocument(artifact.code);
      case "javascript":
        return buildJsDocument(artifact.code);
      case "react":
        return buildReactDocument(artifact.code);
      default:
        return buildTextDocument(artifact.code);
    }
  }, [artifact, isPlaying]);

  return (
    <div className="w-full h-full bg-[#0a0a0a]">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms"
        title={artifact.title || "Artifact Preview"}
      />
    </div>
  );
}
