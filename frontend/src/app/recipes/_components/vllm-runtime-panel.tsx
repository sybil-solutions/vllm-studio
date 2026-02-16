// CRITICAL

import { useCallback, useEffect, useState } from "react";
import { ArrowUpCircle, RefreshCw } from "lucide-react";
import api from "@/lib/api";
import type { VllmRuntimeConfig, VllmRuntimeInfo, VllmUpgradeResult } from "@/lib/types";

export function VllmRuntimePanel() {
  const [runtimeInfo, setRuntimeInfo] = useState<VllmRuntimeInfo | null>(null);
  const [runtimeConfig, setRuntimeConfig] = useState<VllmRuntimeConfig | null>(null);
  const [runtimeLoading, setRuntimeLoading] = useState(false);
  const [runtimeConfigLoading, setRuntimeConfigLoading] = useState(false);
  const [runtimeError, setRuntimeError] = useState<string | null>(null);
  const [upgradeResult, setUpgradeResult] = useState<VllmUpgradeResult | null>(null);
  const [upgrading, setUpgrading] = useState(false);

  const loadRuntime = useCallback(async () => {
    setRuntimeLoading(true);
    setRuntimeError(null);
    try {
      const info = await api.getVllmRuntime();
      setRuntimeInfo(info);
    } catch (e) {
      setRuntimeError((e as Error).message);
    } finally {
      setRuntimeLoading(false);
    }
  }, []);

  const loadRuntimeConfig = useCallback(async () => {
    setRuntimeConfigLoading(true);
    try {
      const config = await api.getVllmRuntimeConfig();
      setRuntimeConfig(config);
    } catch (e) {
      setRuntimeConfig({ config: null, error: (e as Error).message });
    } finally {
      setRuntimeConfigLoading(false);
    }
  }, []);

  const handleUpgradeVllm = useCallback(async () => {
    setUpgrading(true);
    setUpgradeResult(null);
    try {
      const result = await api.upgradeVllmRuntime(true);
      setUpgradeResult(result);
      await loadRuntime();
      await loadRuntimeConfig();
    } catch (e) {
      setUpgradeResult({
        success: false,
        version: null,
        output: null,
        error: (e as Error).message,
        used_wheel: null,
      });
    } finally {
      setUpgrading(false);
    }
  }, [loadRuntime, loadRuntimeConfig]);

  useEffect(() => {
    loadRuntime();
    loadRuntimeConfig();
  }, [loadRuntime, loadRuntimeConfig]);

  return (
    <div style={{ padding: "1.5rem" }} className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">vLLM Runtime</h2>
          <p className="text-sm text-(--dim)">
            Manage the bundled vLLM wheel and inspect available CLI configuration.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              loadRuntime();
              loadRuntimeConfig();
            }}
            disabled={runtimeLoading || runtimeConfigLoading}
            className="flex items-center gap-2 px-3 py-2 bg-(--surface) hover:bg-(--surface) border border-(--border) rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${runtimeLoading || runtimeConfigLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </button>
          <button
            onClick={handleUpgradeVllm}
            disabled={upgrading}
            className="flex items-center gap-2 px-3 py-2 bg-(--accent) hover:bg-(--accent) text-white rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            <ArrowUpCircle className="w-4 h-4" />
            {upgrading ? "Upgrading..." : "Upgrade"}
          </button>
        </div>
      </div>

      {runtimeError && (
        <div className="p-4 bg-(--err)/10 border border-(--err)/30 rounded-lg text-sm text-(--err)">
          {runtimeError}
        </div>
      )}

      {runtimeLoading && !runtimeInfo ? (
        <div className="text-sm text-(--dim)">Loading runtime details...</div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-(--surface) border border-(--border) rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-(--dim) font-medium">
              Installed Version
            </div>
            <div className="mt-2 text-lg font-semibold">{runtimeInfo?.version ?? "Not installed"}</div>
          </div>
          <div className="bg-(--surface) border border-(--border) rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-(--dim) font-medium">
              Bundled Wheel
            </div>
            <div className="mt-2 text-sm text-(--fg) break-all">
              {runtimeInfo?.bundled_wheel?.version
                ? `${runtimeInfo.bundled_wheel.version} (${runtimeInfo.bundled_wheel.path})`
                : "No bundled wheel found"}
            </div>
          </div>
          <div className="bg-(--surface) border border-(--border) rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-(--dim) font-medium">
              Python Runtime
            </div>
            <div className="mt-2 text-sm text-(--fg) break-all">
              {runtimeInfo?.python_path ?? "Not detected"}
            </div>
          </div>
          <div className="bg-(--surface) border border-(--border) rounded-lg p-4">
            <div className="text-xs uppercase tracking-wider text-(--dim) font-medium">
              vLLM Binary
            </div>
            <div className="mt-2 text-sm text-(--fg) break-all">
              {runtimeInfo?.vllm_bin ?? "Not detected"}
            </div>
          </div>
        </div>
      )}

      <div className="bg-(--surface) border border-(--border) rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">vLLM CLI Config (vllm serve --help)</h3>
          <button
            onClick={loadRuntimeConfig}
            disabled={runtimeConfigLoading}
            className="px-3 py-1.5 bg-(--border) hover:bg-(--surface) rounded-lg text-xs transition-colors disabled:opacity-50"
          >
            {runtimeConfigLoading ? "Loading..." : "Refresh"}
          </button>
        </div>
        {runtimeConfig?.error && <div className="text-xs text-(--err)">{runtimeConfig.error}</div>}
        <pre className="max-h-72 overflow-auto text-xs text-(--fg) whitespace-pre-wrap">
          {runtimeConfig?.config || "No config available."}
        </pre>
      </div>

      {upgradeResult && (
        <div
          className={`p-4 border rounded-lg text-sm ${
            upgradeResult.success
              ? "bg-(--hl2)/10 border-(--hl2)/30 text-(--hl2)"
              : "bg-(--err)/10 border-(--err)/30 text-(--err)"
          }`}
        >
          <div className="font-medium">
            {upgradeResult.success ? "Upgrade complete" : "Upgrade failed"}
            {upgradeResult.version ? ` (vLLM ${upgradeResult.version})` : ""}
          </div>
          {upgradeResult.used_wheel && <div className="text-xs mt-1">Wheel: {upgradeResult.used_wheel}</div>}
          {upgradeResult.error && (
            <div className="text-xs mt-2 whitespace-pre-wrap text-(--err)">{upgradeResult.error}</div>
          )}
          {upgradeResult.output && (
            <pre className="text-xs mt-2 whitespace-pre-wrap text-(--fg)">{upgradeResult.output}</pre>
          )}
        </div>
      )}
    </div>
  );
}

