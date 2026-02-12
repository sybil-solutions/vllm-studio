// CRITICAL
"use client";

import { Code, Plus, Terminal, Variable } from "lucide-react";
import type { RecipeEditor } from "@/lib/types";

export function RecipeModalTabEnvironment({
  recipe,
  onChange,
  isLlamacpp,
  envVarEntries,
  onAddEnvVar,
  onChangeEnvVar,
  onRemoveEnvVar,
  extraArgsText,
  extraArgsError,
  onExtraArgsChange,
  llamaConfigLoading,
  llamaConfigHelp,
}: {
  recipe: RecipeEditor;
  onChange: (next: RecipeEditor) => void;
  isLlamacpp: boolean;
  envVarEntries: Array<{ key: string; value: string }>;
  onAddEnvVar: () => void;
  onChangeEnvVar: (index: number, field: "key" | "value", value: string) => void;
  onRemoveEnvVar: (index: number) => void;
  extraArgsText: string;
  extraArgsError: string | null;
  onExtraArgsChange: (value: string) => void;
  llamaConfigLoading: boolean;
  llamaConfigHelp: { config: string | null; error?: string | null } | null;
}) {
  return (
    <div className="space-y-5">
      {!isLlamacpp && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
            <Terminal className="w-4 h-4 text-[#d97706]" />
            <span className="text-sm font-medium">Runtime Configuration</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#9a9088] mb-2">Python Path</label>
            <input
              type="text"
              value={recipe.python_path || ""}
              onChange={(e) => onChange({ ...recipe, python_path: e.target.value || undefined })}
              placeholder="/usr/bin/python or venv/bin/python"
              className="w-full px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
            />
          </div>
        </div>
      )}
      {isLlamacpp && (
        <p className="text-xs text-[#6a6560]">
          llama.cpp uses the configured server binary. Set{" "}
          <span className="font-mono">VLLM_STUDIO_LLAMA_BIN</span> if you need a custom path.
        </p>
      )}

      {/* Environment Variables */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <div className="flex items-center gap-2">
            <Variable className="w-4 h-4 text-[#d97706]" />
            <span className="text-sm font-medium">Environment Variables</span>
          </div>
          <button
            type="button"
            onClick={onAddEnvVar}
            className="flex items-center gap-1 px-3 py-1.5 bg-[#363432] hover:bg-[#494745] rounded-lg text-xs transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add
          </button>
        </div>

        <div className="space-y-2">
          {envVarEntries.map((entry, index) => (
            <div key={`${entry.key}-${index}`} className="grid grid-cols-[1fr,1fr,auto] gap-2">
              <input
                type="text"
                value={entry.key}
                onChange={(e) => onChangeEnvVar(index, "key", e.target.value)}
                placeholder="KEY"
                className="px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm font-mono focus:outline-none focus:border-[#d97706]"
              />
              <input
                type="text"
                value={entry.value}
                onChange={(e) => onChangeEnvVar(index, "value", e.target.value)}
                placeholder="value"
                className="px-3 py-2 bg-[#0d0d0d] border border-[#363432] rounded-lg text-sm focus:outline-none focus:border-[#d97706]"
              />
              <button
                type="button"
                onClick={() => onRemoveEnvVar(index)}
                className="px-3 py-2 bg-[#2a2724] hover:bg-[#363432] rounded-lg text-xs transition-colors"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Extra Args */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#e8e6e3] pb-2 border-b border-[#363432]/50">
          <Code className="w-4 h-4 text-[#d97706]" />
          <span className="text-sm font-medium">Extra CLI Arguments</span>
        </div>

        <div className="bg-[#0d0d0d] border border-[#363432] rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[#1b1b1b] border-b border-[#363432]">
            <span className="text-xs text-[#9a9088]">JSON Editor</span>
            {extraArgsError && <span className="text-xs text-[#fca5a5]">Invalid JSON</span>}
          </div>
          <textarea
            value={extraArgsText}
            onChange={(e) => onExtraArgsChange(e.target.value)}
            rows={10}
            spellCheck={false}
            className="w-full px-3 py-2 bg-transparent border-0 text-xs font-mono focus:outline-none resize-none"
            placeholder='{\"custom-flag\": true}'
          />
        </div>
        <p className="text-xs text-[#6a6560]">
          Extra arguments are passed directly to the CLI. These override form fields.
        </p>
      </div>

      {isLlamacpp && (
        <details className="bg-[#0d0d0d] border border-[#363432] rounded-lg overflow-hidden">
          <summary className="cursor-pointer px-3 py-2 text-xs text-[#9a9088] bg-[#1b1b1b] border-b border-[#363432]">
            llama.cpp CLI Reference
          </summary>
          <div className="px-3 py-2">
            {llamaConfigLoading && <div className="text-xs text-[#9a9088]">Loading llama.cpp config…</div>}
            {!llamaConfigLoading && llamaConfigHelp?.error && (
              <div className="text-xs text-[#fca5a5]">{llamaConfigHelp.error}</div>
            )}
            {!llamaConfigLoading && !llamaConfigHelp?.error && (
              <pre className="text-xs text-[#9a9088] whitespace-pre-wrap">
                {llamaConfigHelp?.config ?? "No config data returned."}
              </pre>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
