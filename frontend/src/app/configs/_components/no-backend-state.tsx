// CRITICAL
import { Activity, Server } from "lucide-react";

export function NoBackendState({
  error,
  isInitialLoading,
  loading,
  onRetry,
  helperText,
}: {
  error: string | null;
  isInitialLoading: boolean;
  loading: boolean;
  onRetry: () => void;
  helperText?: string;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="bg-(--surface) rounded-lg p-4 sm:p-6 border border-(--border)">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-(--fg)">
              {isInitialLoading ? (
                <Activity className="h-4 w-4 text-(--dim) animate-pulse" />
              ) : (
                <Server className="h-4 w-4 text-(--hl3)" />
              )}
              <span>{isInitialLoading ? "Checking controller connection…" : "No backend detected"}</span>
            </div>
            <p className="text-xs text-(--dim)">
              {helperText ??
                "Configure the API connection above and click Test or Retry to load system details."}
            </p>
            {error && !isInitialLoading && (
              <p className="text-[10px] text-(--err)">Last error: {error}</p>
            )}
          </div>
          <button
            onClick={onRetry}
            disabled={loading}
            className="px-3 py-1.5 bg-(--border) rounded-lg text-xs text-(--fg) hover:bg-(--surface) disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}
