// CRITICAL
"use client";

import { ChevronRight, Cpu, DownloadCloud, HardDrive, Loader2 } from "lucide-react";
import type { StudioDiagnostics, VllmUpgradeResult } from "@/lib/types";
import { formatBytes } from "./utils";

export function StepHardware({
  diagnostics,
  upgradeRuntime,
  upgrading,
  upgradeResult,
  setStep,
}: {
  diagnostics: StudioDiagnostics | null;
  upgradeRuntime: () => void;
  upgrading: boolean;
  upgradeResult: VllmUpgradeResult | null;
  setStep: (step: number) => void;
}) {
  return (
    <div className="grid gap-6">
      <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <Cpu className="h-5 w-5 text-(--accent-purple)" />
          <h2 className="text-lg font-medium">Hardware Check</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-4 text-sm text-[#c7c1ba]">
          <div>
            <div className="text-xs text-[#9a9088] mb-1">CPU</div>
            <div>
              {diagnostics?.cpu_model ?? "Unknown"} · {diagnostics?.cpu_cores ?? 0} cores
            </div>
          </div>
          <div>
            <div className="text-xs text-[#9a9088] mb-1">Memory</div>
            <div>{formatBytes(diagnostics?.memory_total ?? null)} total</div>
          </div>
          <div>
            <div className="text-xs text-[#9a9088] mb-1">GPU</div>
            <div>
              {diagnostics?.gpus?.length ? diagnostics.gpus.map((gpu) => gpu.name).join(", ") : "No CUDA GPU detected"}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#9a9088] mb-1">VRAM</div>
            <div>
              {diagnostics?.gpus?.[0]?.memory_total_mb
                ? `${Math.round(diagnostics.gpus[0].memory_total_mb / 1024)} GB`
                : "CPU only"}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6 space-y-4">
        <div className="flex items-center gap-3">
          <HardDrive className="h-5 w-5 text-(--accent-purple)" />
          <h2 className="text-lg font-medium">Runtime</h2>
        </div>
        <div className="text-sm text-[#c7c1ba]">
          {diagnostics?.runtime.vllm_installed
            ? `vLLM ${diagnostics.runtime.vllm_version ?? ""} detected.`
            : "vLLM runtime not detected. Install to continue."}
        </div>
        {upgradeResult && (
          <div className={`text-xs ${upgradeResult.success ? "text-(--success)" : "text-(--error)"}`}>
            {upgradeResult.success ? `Updated to vLLM ${upgradeResult.version}` : upgradeResult.error}
          </div>
        )}
        <div className="flex items-center gap-3">
          <button
            onClick={upgradeRuntime}
            disabled={upgrading}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#26231f] text-sm hover:bg-[#322f2a] disabled:opacity-60"
          >
            {upgrading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}
            Install / Upgrade vLLM
          </button>
          <button
            onClick={() => setStep(2)}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-(--accent-purple) text-white text-sm hover:opacity-90"
          >
            Continue
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

