// CRITICAL
"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Cpu,
  DownloadCloud,
  HardDrive,
  Loader2,
  Pause,
  Play,
  Rocket,
  XCircle,
} from "lucide-react";
import type { ModelDownload, ModelRecommendation, StudioDiagnostics, StudioSettings, VllmUpgradeResult } from "@/lib/types";

interface SetupViewProps {
  step: number;
  setStep: (step: number) => void;
  loading: boolean;
  error: string | null;
  settings: StudioSettings | null;
  modelsDir: string;
  setModelsDir: (value: string) => void;
  diagnostics: StudioDiagnostics | null;
  recommendations: ModelRecommendation[];
  maxVram: number;
  selectedModel: string;
  manualModelId: string;
  setManualModelId: (value: string) => void;
  savingSettings: boolean;
  upgrading: boolean;
  upgradeResult: VllmUpgradeResult | null;
  downloads: ModelDownload[];
  activeDownload: ModelDownload | null;
  pauseDownload: (id: string) => void;
  resumeDownload: (id: string) => void;
  cancelDownload: (id: string) => void;
  saveSettings: () => void;
  upgradeRuntime: () => void;
  beginDownload: (modelId: string) => void;
  submitManualModel: () => void;
  createRecipeAndFinish: () => void;
  skipSetup: () => void;
}

const steps = ["Welcome", "Hardware", "Model", "Download"];

const formatBytes = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) return "-";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unitIndex]}`;
};

const progressPercent = (download: ModelDownload | null): number => {
  if (!download?.total_bytes) return 0;
  return Math.min(100, Math.round((download.downloaded_bytes / download.total_bytes) * 100));
};

export function SetupView({
  step,
  setStep,
  loading,
  error,
  settings,
  modelsDir,
  setModelsDir,
  diagnostics,
  recommendations,
  maxVram,
  selectedModel,
  manualModelId,
  setManualModelId,
  savingSettings,
  upgrading,
  upgradeResult,
  downloads,
  activeDownload,
  pauseDownload,
  resumeDownload,
  cancelDownload,
  saveSettings,
  upgradeRuntime,
  beginDownload,
  submitManualModel,
  createRecipeAndFinish,
  skipSetup,
}: SetupViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0b0b0b] via-[#141312] to-[#1e1c1a] text-[#f0ebe3]">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm text-[#9a9088] uppercase tracking-wider">Setup Wizard</div>
            <h1 className="text-2xl font-semibold">vLLM Studio Desktop</h1>
          </div>
          <button
            onClick={skipSetup}
            className="px-3 py-1.5 text-xs text-[#9a9088] border border-[#2a2724] rounded-lg hover:text-[#f0ebe3] hover:border-[#3a3530]"
          >
            Skip for now
          </button>
        </div>

        <div className="flex items-center gap-3 mb-8">
          {steps.map((label, index) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${
                  index <= step ? "bg-(--accent-purple) text-white" : "bg-[#1f1d1b] text-[#9a9088]"
                }`}
              >
                {index + 1}
              </div>
              <div className="text-sm text-[#c7c1ba]">{label}</div>
              {index < steps.length - 1 && <ChevronRight className="h-4 w-4 text-[#3a3530]" />}
            </div>
          ))}
        </div>

        {loading && (
          <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-[#9a9088]" />
            <span className="text-sm text-[#c7c1ba]">Preparing your setup...</span>
          </div>
        )}

        {error && (
          <div className="bg-[#2b1c1c] border border-[#5a2b2b] rounded-lg p-4 mb-6 text-sm text-[#f3b6b6] flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!loading && step === 0 && (
          <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6 space-y-5">
            <div className="flex items-center gap-3">
              <Rocket className="h-5 w-5 text-(--accent-purple)" />
              <h2 className="text-lg font-medium">Welcome to vLLM Studio</h2>
            </div>
            <p className="text-sm text-[#c7c1ba]">
              This wizard configures local paths, checks your hardware, and downloads a starter model so you can chat right away.
            </p>
            <div>
              <label className="block text-xs text-[#9a9088] mb-2">Models directory</label>
              <input
                value={modelsDir}
                onChange={(event) => setModelsDir(event.target.value)}
                className="w-full bg-[#0f0f0f] border border-[#2a2724] rounded-lg px-3 py-2 text-sm"
              />
              {settings?.config_path && (
                <div className="text-xs text-[#6f6760] mt-2">
                  Saved to {settings.config_path}
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={saveSettings}
                disabled={savingSettings}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-(--accent-purple) text-white text-sm font-medium hover:opacity-90 disabled:opacity-60"
              >
                {savingSettings ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Continue
              </button>
            </div>
          </div>
        )}

        {!loading && step === 1 && (
          <div className="grid gap-6">
            <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Cpu className="h-5 w-5 text-(--accent-purple)" />
                <h2 className="text-lg font-medium">Hardware Check</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-[#c7c1ba]">
                <div>
                  <div className="text-xs text-[#9a9088] mb-1">CPU</div>
                  <div>{diagnostics?.cpu_model ?? "Unknown"} · {diagnostics?.cpu_cores ?? 0} cores</div>
                </div>
                <div>
                  <div className="text-xs text-[#9a9088] mb-1">Memory</div>
                  <div>{formatBytes(diagnostics?.memory_total ?? null)} total</div>
                </div>
                <div>
                  <div className="text-xs text-[#9a9088] mb-1">GPU</div>
                  <div>
                    {diagnostics?.gpus?.length
                      ? diagnostics.gpus.map((gpu) => gpu.name).join(", ")
                      : "No CUDA GPU detected"}
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
        )}

        {!loading && step === 2 && (
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
        )}

        {!loading && step === 3 && (
          <div className="space-y-5">
            <div className="bg-[#141312] border border-[#2a2724] rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-[#9a9088] uppercase tracking-wider">Download</div>
                  <h2 className="text-lg font-medium">Fetching {selectedModel || "model"}</h2>
                </div>
                {activeDownload && (
                  <span className="text-xs text-[#9a9088]">{activeDownload.status}</span>
                )}
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
                  {activeDownload.error && (
                    <div className="text-xs text-(--error)">{activeDownload.error}</div>
                  )}
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
              <div className="text-xs text-[#9a9088]">
                Additional downloads in queue: {downloads.length - 1}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
