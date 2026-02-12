// CRITICAL
"use client";

import { ChevronLeft, DownloadCloud } from "lucide-react";
import type { ModelRecommendation } from "@/lib/types";

export function StepModel({
  recommendations,
  maxVram,
  manualModelId,
  setManualModelId,
  beginDownload,
  submitManualModel,
  setStep,
}: {
  recommendations: ModelRecommendation[];
  maxVram: number;
  manualModelId: string;
  setManualModelId: (value: string) => void;
  beginDownload: (modelId: string) => void;
  submitManualModel: () => void;
  setStep: (step: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-[#9a9088] uppercase tracking-wider">Recommended</div>
            <h2 className="text-lg font-medium">Pick a starter model</h2>
          </div>
          <div className="text-xs text-[#9a9088]">Detected VRAM: {maxVram ? `${maxVram.toFixed(1)} GB` : "CPU"}</div>
        </div>
        <div className="grid md:grid-cols-2 gap-4 mt-4">
          {recommendations.map((model) => (
            <div key={model.id} className="border border-[#2a2724] rounded-lg p-4 bg-[#101010]">
              <div className="text-sm font-medium">{model.name}</div>
              <div className="text-xs text-[#9a9088]">{model.id}</div>
              <p className="text-xs text-[#c7c1ba] mt-2">{model.description}</p>
              <div className="flex items-center gap-2 text-xs text-[#9a9088] mt-3">
                <span>{model.size_gb ?? "-"} GB</span>
                <span>·</span>
                <span>{model.min_vram_gb ?? "-"} GB VRAM</span>
              </div>
              <button
                onClick={() => beginDownload(model.id)}
                className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--accent-purple) text-white text-xs font-medium hover:opacity-90"
              >
                <DownloadCloud className="h-3.5 w-3.5" />
                Download
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6">
        <div className="text-sm text-[#9a9088] uppercase tracking-wider">Manual</div>
        <h3 className="text-lg font-medium">Download by model ID</h3>
        <div className="flex flex-col sm:flex-row gap-3 mt-3">
          <input
            value={manualModelId}
            onChange={(event) => setManualModelId(event.target.value)}
            placeholder="e.g. meta-llama/Llama-3.1-8B-Instruct"
            className="flex-1 bg-[#0f0f0f] border border-[#2a2724] rounded-lg px-3 py-2 text-sm"
          />
          <button
            onClick={submitManualModel}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[#26231f] text-sm hover:bg-[#322f2a]"
          >
            <DownloadCloud className="h-4 w-4" />
            Download
          </button>
        </div>
        <div className="flex items-center gap-3 mt-4">
          <button
            onClick={() => setStep(1)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[#2a2724] text-xs hover:bg-[#1f1d1b]"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
      </div>
    </div>
  );
}

