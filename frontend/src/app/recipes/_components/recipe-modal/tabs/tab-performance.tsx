// CRITICAL
"use client";

import { Clock, Database, Zap } from "lucide-react";
import type { Recipe } from "@/lib/types";
import { LlamacppOptionsSection } from "../llamacpp-options-section";

export function RecipeModalTabPerformance({
  recipe,
  onChange,
  isLlamacpp,
  getExtraArgValueForKey,
  setExtraArgValueForKey,
}: {
  recipe: Recipe;
  onChange: (next: Recipe) => void;
  isLlamacpp: boolean;
  getExtraArgValueForKey: (key: string) => unknown;
  setExtraArgValueForKey: (key: string, value: unknown) => void;
}) {
  if (isLlamacpp) {
    return (
      <div className="space-y-5">
        <LlamacppOptionsSection
          tab="performance"
          getValueForKey={getExtraArgValueForKey}
          setValueForKey={setExtraArgValueForKey}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* CUDA Graphs */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <Zap className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-medium">CUDA Graphs & Compilation</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#363432] rounded-lg">
            <input
              type="checkbox"
              id="enforce_eager"
              checked={recipe.enforce_eager || false}
              onChange={(e) => onChange({ ...recipe, enforce_eager: e.target.checked })}
              className="rounded border-[#363432] bg-[#1b1b1b] w-4 h-4"
            />
            <div className="flex-1">
              <label htmlFor="enforce_eager" className="text-sm font-medium text-[#e8e6e3] cursor-pointer">
                Enforce Eager Mode
              </label>
              <p className="text-xs text-[#6a6560]">Disables CUDA graphs for debugging</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#363432] rounded-lg">
            <input
              type="checkbox"
              id="disable_cuda_graph"
              checked={recipe.disable_cuda_graph || false}
              onChange={(e) => onChange({ ...recipe, disable_cuda_graph: e.target.checked })}
              className="rounded border-[#363432] bg-[#1b1b1b] w-4 h-4"
            />
            <div className="flex-1">
              <label htmlFor="disable_cuda_graph" className="text-sm font-medium text-[#e8e6e3] cursor-pointer">
                Disable CUDA Graph
              </label>
              <p className="text-xs text-[#6a6560]">Skip graph capture for dynamic shapes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#363432] rounded-lg">
            <input
              type="checkbox"
              id="use_v2_block_manager"
              checked={recipe.use_v2_block_manager || false}
              onChange={(e) => onChange({ ...recipe, use_v2_block_manager: e.target.checked })}
              className="rounded border-[#363432] bg-[#1b1b1b] w-4 h-4"
            />
            <div className="flex-1">
              <label htmlFor="use_v2_block_manager" className="text-sm font-medium text-[#e8e6e3] cursor-pointer">
                v2 Block Manager
              </label>
              <p className="text-xs text-[#6a6560]">New memory management</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#363432] rounded-lg">
            <input
              type="checkbox"
              id="disable_custom_all_reduce"
              checked={recipe.disable_custom_all_reduce || false}
              onChange={(e) => onChange({ ...recipe, disable_custom_all_reduce: e.target.checked })}
              className="rounded border-[#363432] bg-[#1b1b1b] w-4 h-4"
            />
            <div className="flex-1">
              <label
                htmlFor="disable_custom_all_reduce"
                className="text-sm font-medium text-[#e8e6e3] cursor-pointer"
              >
                Disable Custom AllReduce
              </label>
              <p className="text-xs text-[#6a6560]">Use default NCCL collectives</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">CUDA Graph Max Batch Size</label>
            <input
              type="number"
              value={recipe.cuda_graph_max_bs || ""}
              onChange={(e) => onChange({ ...recipe, cuda_graph_max_bs: Number(e.target.value) || undefined })}
              placeholder="Default"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Compilation Config</label>
            <input
              type="text"
              value={recipe.compilation_config || ""}
              onChange={(e) => onChange({ ...recipe, compilation_config: e.target.value || undefined })}
              placeholder={`e.g., {\"level\": 3}`}
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
        </div>
      </div>

      {/* KV Cache */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <Database className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-medium">KV Cache & Memory</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">KV Cache Dtype</label>
            <select
              value={recipe.kv_cache_dtype || "auto"}
              onChange={(e) =>
                onChange({ ...recipe, kv_cache_dtype: e.target.value === "auto" ? undefined : e.target.value })
              }
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            >
              <option value="auto">Auto</option>
              <option value="fp8">FP8</option>
              <option value="fp8_e5m2">FP8 E5M2</option>
              <option value="fp8_e4m3">FP8 E4M3</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Block Size</label>
            <select
              value={recipe.block_size || "16"}
              onChange={(e) => onChange({ ...recipe, block_size: Number(e.target.value) || undefined })}
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            >
              <option value="8">8</option>
              <option value="16">16</option>
              <option value="32">32</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#363432] rounded-lg">
            <input
              type="checkbox"
              id="enable_prefix_caching"
              checked={recipe.enable_prefix_caching || false}
              onChange={(e) => onChange({ ...recipe, enable_prefix_caching: e.target.checked })}
              className="rounded border-[#363432] bg-[#1b1b1b] w-4 h-4"
            />
            <div className="flex-1">
              <label htmlFor="enable_prefix_caching" className="text-sm font-medium text-[#e8e6e3] cursor-pointer">
                Prefix Caching
              </label>
              <p className="text-xs text-[#6a6560]">Cache shared prefixes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-[#0d0d0d] border border-[#363432] rounded-lg">
            <input
              type="checkbox"
              id="enable_chunked_prefill"
              checked={recipe.enable_chunked_prefill || false}
              onChange={(e) => onChange({ ...recipe, enable_chunked_prefill: e.target.checked })}
              className="rounded border-[#363432] bg-[#1b1b1b] w-4 h-4"
            />
            <div className="flex-1">
              <label htmlFor="enable_chunked_prefill" className="text-sm font-medium text-[#e8e6e3] cursor-pointer">
                Chunked Prefill
              </label>
              <p className="text-xs text-[#6a6560]">Interleave prefill/decode</p>
            </div>
          </div>
        </div>
      </div>

      {/* Scheduling */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <Clock className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-medium">Scheduler & Batching</span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Max Sequences</label>
            <input
              type="number"
              value={recipe.max_num_seqs || ""}
              onChange={(e) => onChange({ ...recipe, max_num_seqs: Number(e.target.value) || undefined })}
              placeholder="256"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Max Batched Tokens</label>
            <input
              type="number"
              value={recipe.max_num_batched_tokens || ""}
              onChange={(e) =>
                onChange({ ...recipe, max_num_batched_tokens: Number(e.target.value) || undefined })
              }
              placeholder="Auto"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Max Paddings</label>
            <input
              type="number"
              value={recipe.max_paddings || ""}
              onChange={(e) => onChange({ ...recipe, max_paddings: Number(e.target.value) || undefined })}
              placeholder="Auto"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-[#9a9088] mb-2">Scheduling Policy</label>
          <select
            value={recipe.scheduling_policy || ""}
            onChange={(e) =>
              onChange({
                ...recipe,
                scheduling_policy: e.target.value ? (e.target.value as "fcfs" | "priority") : undefined,
              })
            }
            className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
          >
            <option value="">Default</option>
            <option value="fcfs">FCFS (First Come First Serve)</option>
            <option value="priority">Priority</option>
          </select>
        </div>
      </div>
    </div>
  );
}

