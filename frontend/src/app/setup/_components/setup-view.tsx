// CRITICAL
"use client";

import { AlertTriangle, Loader2 } from "lucide-react";
import type { ModelDownload, ModelRecommendation, StudioDiagnostics, StudioSettings, VllmUpgradeResult } from "@/lib/types";
import { SetupStepper } from "./setup-view/setup-stepper";
import { StepDownload } from "./setup-view/step-download";
import { StepHardware } from "./setup-view/step-hardware";
import { StepModel } from "./setup-view/step-model";
import { StepWelcome } from "./setup-view/step-welcome";

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
          <SetupStepper step={step} />
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
          <StepWelcome
            modelsDir={modelsDir}
            setModelsDir={setModelsDir}
            settings={settings}
            saveSettings={saveSettings}
            savingSettings={savingSettings}
          />
        )}

        {!loading && step === 1 && (
          <StepHardware
            diagnostics={diagnostics}
            upgradeRuntime={upgradeRuntime}
            upgrading={upgrading}
            upgradeResult={upgradeResult}
            setStep={setStep}
          />
        )}

        {!loading && step === 2 && (
          <StepModel
            recommendations={recommendations}
            maxVram={maxVram}
            manualModelId={manualModelId}
            setManualModelId={setManualModelId}
            beginDownload={beginDownload}
            submitManualModel={submitManualModel}
            setStep={setStep}
          />
        )}

        {!loading && step === 3 && (
          <StepDownload
            selectedModel={selectedModel}
            modelsDir={modelsDir}
            downloads={downloads}
            activeDownload={activeDownload}
            pauseDownload={pauseDownload}
            resumeDownload={resumeDownload}
            cancelDownload={cancelDownload}
            createRecipeAndFinish={createRecipeAndFinish}
          />
        )}
      </div>
    </div>
  );
}
