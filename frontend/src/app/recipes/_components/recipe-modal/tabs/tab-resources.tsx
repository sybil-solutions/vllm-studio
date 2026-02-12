// CRITICAL
"use client";

import { Cpu, Database, GitBranch } from "lucide-react";
import type { RecipeEditor } from "@/lib/types";
import { LlamacppOptionsSection } from "../llamacpp-options-section";

export function RecipeModalTabResources({
  recipe,
  onChange,
  isLlamacpp,
  getExtraArgValueForKey,
  setExtraArgValueForKey,
}: {
  recipe: RecipeEditor;
  onChange: (next: RecipeEditor) => void;
  isLlamacpp: boolean;
  getExtraArgValueForKey: (key: string) => unknown;
  setExtraArgValueForKey: (key: string, value: unknown) => void;
}) {
  if (isLlamacpp) {
    return (
      <div className="space-y-5">
        <LlamacppOptionsSection
          tab="resources"
          getValueForKey={getExtraArgValueForKey}
          setValueForKey={setExtraArgValueForKey}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Parallelism */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <GitBranch className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-medium">Parallelism</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Tensor Parallel (TP)</label>
            <input
              type="number"
              min={1}
              value={recipe.tp ?? recipe.tensor_parallel_size ?? 1}
              onChange={(e) =>
                onChange({
                  ...recipe,
                  tp: Number(e.target.value),
                  tensor_parallel_size: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Pipeline Parallel (PP)</label>
            <input
              type="number"
              min={1}
              value={recipe.pp ?? recipe.pipeline_parallel_size ?? 1}
              onChange={(e) =>
                onChange({
                  ...recipe,
                  pp: Number(e.target.value),
                  pipeline_parallel_size: Number(e.target.value),
                })
              }
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Data Parallel</label>
            <input
              type="number"
              min={1}
              value={recipe.data_parallel_size || ""}
              onChange={(e) =>
                onChange({ ...recipe, data_parallel_size: Number(e.target.value) || undefined })
              }
              placeholder="1"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Distributed Executor</label>
            <select
              value={recipe.distributed_executor_backend || ""}
              onChange={(e) =>
                onChange({
                  ...recipe,
                  distributed_executor_backend: e.target.value
                    ? (e.target.value as "ray" | "mp")
                    : undefined,
                })
              }
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            >
              <option value="">Default</option>
              <option value="ray">Ray</option>
              <option value="mp">MP (Multiprocessing)</option>
            </select>
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 text-sm text-[#9a9088] cursor-pointer hover:text-[#e8e6e3] transition-colors">
              <input
                type="checkbox"
                checked={recipe.enable_expert_parallel || false}
                onChange={(e) => onChange({ ...recipe, enable_expert_parallel: e.target.checked })}
                className="rounded border-[#363432] bg-[#0d0d0d] w-4 h-4"
              />
              Expert Parallel (MoE)
            </label>
          </div>
        </div>
      </div>

      {/* GPU Settings */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <Cpu className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-medium">GPU Settings</span>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9a9088] mb-2">GPU Memory Utilization</label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={recipe.gpu_memory_utilization ?? 0.9}
              onChange={(e) =>
                onChange({ ...recipe, gpu_memory_utilization: Number(e.target.value) })
              }
              className="flex-1 h-2 bg-[#363432] rounded-lg appearance-none cursor-pointer accent-[#d97706]"
            />
            <span className="text-sm font-mono w-12 text-right">
              {Math.round((recipe.gpu_memory_utilization ?? 0.9) * 100)}%
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9a9088] mb-2">CUDA Visible Devices</label>
          <input
            type="text"
            value={recipe.cuda_visible_devices || ""}
            onChange={(e) => onChange({ ...recipe, cuda_visible_devices: e.target.value || undefined })}
            placeholder="0,1,2,3 or all"
            className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
          />
        </div>
      </div>

      {/* Memory Management */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <Database className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-medium">Memory Management</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Swap Space (GB)</label>
            <input
              type="number"
              value={recipe.swap_space || ""}
              onChange={(e) => onChange({ ...recipe, swap_space: Number(e.target.value) || undefined })}
              placeholder="0"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">CPU Offload (GB)</label>
            <input
              type="number"
              value={recipe.cpu_offload_gb || ""}
              onChange={(e) =>
                onChange({ ...recipe, cpu_offload_gb: Number(e.target.value) || undefined })
              }
              placeholder="0"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">GPU Blocks Override</label>
            <input
              type="number"
              value={recipe.num_gpu_blocks_override || ""}
              onChange={(e) =>
                onChange({ ...recipe, num_gpu_blocks_override: Number(e.target.value) || undefined })
              }
              placeholder="Auto"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
