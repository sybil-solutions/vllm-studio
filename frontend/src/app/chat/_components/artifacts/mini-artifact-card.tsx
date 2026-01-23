"use client";

import { Code, FileCode, Palette, ExternalLink } from "lucide-react";
import type { Artifact } from "@/lib/types";

interface MiniArtifactCardProps {
  artifact: Artifact;
  onClick?: () => void;
}

export function MiniArtifactCard({ artifact, onClick }: MiniArtifactCardProps) {
  const icon =
    artifact.type === "svg" ? (
      <Palette className="h-4 w-4" />
    ) : artifact.type === "html" ? (
      <FileCode className="h-4 w-4" />
    ) : (
      <Code className="h-4 w-4" />
    );

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg border border-(--border) bg-(--card) hover:bg-(--accent) transition-colors text-left w-full group"
    >
      <div className="flex-shrink-0 w-10 h-10 rounded bg-(--accent) flex items-center justify-center text-[#9a9590] group-hover:text-(--foreground)">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">
          {artifact.title || `${artifact.type.toUpperCase()} Artifact`}
        </div>
        <div className="text-xs text-[#9a9590]">
          Click to view • {artifact.code.split("\n").length} lines
        </div>
      </div>
      <ExternalLink className="h-4 w-4 text-[#9a9590] opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
