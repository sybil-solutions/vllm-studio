// CRITICAL
"use client";

import { CheckCircle2, ChevronRight, HardDrive, Pause, Play, XCircle } from "lucide-react";
import type { ModelDownload } from "@/lib/types";
import { formatBytes, progressPercent } from "./utils";

export function StepDownload({
  selectedModel,
  modelsDir,
  downloads,
  activeDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  createRecipeAndFinish,
}: {
  selectedModel: string;
  modelsDir: string;
  downloads: ModelDownload[];
  activeDownload: ModelDownload | null;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  createRecipeAndFinish: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#9a9088] uppercase tracking-wider">Download</div>
            <h2 className="text-lg font-medium">Fetching {selectedModel || "model"}</h2>
          </div>
          {activeDownload && <span className="text-xs text-[#9a9088]">{activeDownload.status}</span>}
        </div>
        {activeDownload ? (
          <div className="mt-4 space-y-3">
            <div className="h-2 bg-[#1f1d1b] rounded-full">
              <div
                className="h-2 rounded-full bg-(--accent-purple) transition-all"
                style={{ width: `${progressPercent(activeDownload)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-[#9a9088]">
              <span>
                {formatBytes(activeDownload.downloaded_bytes)} / {formatBytes(activeDownload.total_bytes)}
              </span>
              <span>{progressPercent(activeDownload)}%</span>
            </div>
            {activeDownload.error && <div className="text-xs text-(--error)">{activeDownload.error}</div>}
            <div className="flex items-center gap-3">
              {activeDownload.status === "downloading" && (
                <button
                  onClick={() => pauseDownload(activeDownload.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2724] text-xs"
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </button>
              )}
              {(activeDownload.status === "paused" || activeDownload.status === "failed") && (
                <button
                  onClick={() => resumeDownload(activeDownload.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2724] text-xs"
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </button>
              )}
              {activeDownload.status !== "completed" && (
                <button
                  onClick={() => cancelDownload(activeDownload.id)}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2724] text-xs text-(--error)"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-[#9a9088] mt-4">No active download yet.</div>
        )}
      </div>

      <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-[#c7c1ba]">
          {activeDownload?.status === "completed" ? (
            <>
              <CheckCircle2 className="h-4 w-4 text-(--success)" />
              Model ready. Create a recipe and open chat.
            </>
          ) : (
            <>
              <HardDrive className="h-4 w-4 text-[#9a9088]" />
              Downloading to {modelsDir}
            </>
          )}
        </div>
        <button
          onClick={createRecipeAndFinish}
          disabled={activeDownload?.status !== "completed"}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-(--accent-purple) text-white text-sm font-medium disabled:opacity-50"
        >
          Finish Setup
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {downloads.length > 1 && (
        <div className="text-xs text-[#9a9088]">Additional downloads in queue: {downloads.length - 1}</div>
      )}
    </div>
  );
}

