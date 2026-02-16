// CRITICAL
"use client";

import { useMemo, useState } from "react";
import { FileText, Folder, Terminal } from "lucide-react";
import type { AgentFileEntry, AgentFileVersion } from "@/lib/types";
import type { AgentPlan } from "./agent-types";
import { AgentFileContentViewer } from "./agent-file-content-viewer";
import {
  AgentFileTreeNode,
  buildAgentFilePath,
  countAgentFiles,
} from "./agent-files-tree";

interface AgentFilesPanelProps {
  files: AgentFileEntry[];
  fileVersions: Record<string, AgentFileVersion[]>;
  plan?: AgentPlan | null;
  selectedFilePath: string | null;
  selectedFileContent: string | null;
  selectedFileLoading: boolean;
  onSelectFile: (path: string | null) => void;
  hasSession: boolean;
}

const EMPTY_VERSIONS: AgentFileVersion[] = [];

function AgentFilesTree({
  files,
  selectedFilePath,
  onSelectFile,
}: {
  files: AgentFileEntry[];
  selectedFilePath: string | null;
  onSelectFile: (path: string | null) => void;
}) {
  if (files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <Folder className="h-8 w-8 text-(--border) mb-3" />
        <p className="text-xs text-(--dim) mb-1">No files yet</p>
        <p className="text-[10px] text-(--dim) max-w-45 leading-relaxed">
          Files created by the agent during execution will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="py-1 overflow-y-auto h-full">
      {files.map((entry) => {
        const fullPath = buildAgentFilePath(entry, "");
        return (
          <AgentFileTreeNode
            key={fullPath}
            entry={entry}
            depth={0}
            fullPath={fullPath}
            selectedPath={selectedFilePath}
            onSelect={onSelectFile}
          />
        );
      })}
    </div>
  );
}

export function AgentFilesPanel({
  files,
  fileVersions,
  plan,
  selectedFilePath,
  selectedFileContent,
  selectedFileLoading,
  onSelectFile,
  hasSession,
}: AgentFilesPanelProps) {
  const hasFiles = files.length > 0;
  const hasSelectedFile = selectedFilePath !== null;
  const versionsForSelected = selectedFilePath ? (fileVersions[selectedFilePath] ?? EMPTY_VERSIONS) : EMPTY_VERSIONS;
  const [pane, setPane] = useState<"open" | "browse">(hasSelectedFile ? "open" : "browse");
  const effectivePane: "open" | "browse" = hasSelectedFile ? pane : "browse";

  const handleSelect = (path: string | null) => {
    onSelectFile(path);
    setPane(path ? "open" : "browse");
  };

  const doneSteps = useMemo(() => {
    if (!plan) return 0;
    let done = 0;
    for (const step of plan.steps) {
      if (step.status === "done") done += 1;
    }
    return done;
  }, [plan]);

  return (
    <div className="flex flex-col h-full">
      <div className="px-2.5 py-1.5 border-b border-(--border) flex items-center gap-1.5 shrink-0">
        <Terminal className="h-3 w-3 text-violet-400" />
        <span className="text-[10px] text-(--dim) font-mono truncate">~/agent-workspace</span>
        <span className="ml-auto text-[10px] text-(--dim)">
          {hasFiles ? `${countAgentFiles(files)} files` : "Empty"}
          {plan ? ` · ${doneSteps}/${plan.steps.length} steps` : ""}
        </span>
      </div>

      <div className="px-2 py-1 border-b border-(--border) flex items-center gap-1 shrink-0 overflow-x-auto">
        <button
          onClick={() => setPane("open")}
          disabled={!hasSelectedFile}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
            effectivePane === "open"
              ? "bg-(--border) text-foreground"
              : hasSelectedFile
                ? "text-(--dim) hover:text-(--dim) hover:bg-(--border)"
                : "text-(--dim) cursor-not-allowed"
          }`}
          title={hasSelectedFile ? selectedFilePath ?? "Open file" : "Select a file first"}
        >
          <span className="inline-flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            {hasSelectedFile ? (selectedFilePath?.split("/").pop() ?? "Open") : "Open"}
          </span>
        </button>
        <button
          onClick={() => setPane("browse")}
          className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors whitespace-nowrap ${
            effectivePane === "browse"
              ? "bg-violet-500/15 text-violet-300"
              : "text-violet-400/50 hover:text-violet-300/70 hover:bg-violet-500/5"
          }`}
        >
          Files
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {effectivePane === "browse" ? (
          <AgentFilesTree files={files} selectedFilePath={selectedFilePath} onSelectFile={handleSelect} />
        ) : hasSelectedFile ? (
          <AgentFileContentViewer
            key={selectedFilePath}
            path={selectedFilePath}
            content={selectedFileContent}
            versions={versionsForSelected}
            allFileVersions={fileVersions}
            loading={selectedFileLoading}
            onClose={() => handleSelect(null)}
            hasSession={hasSession}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-center px-4">
            <p className="text-xs text-(--dim)">Select a file to preview</p>
          </div>
        )}
      </div>
    </div>
  );
}
