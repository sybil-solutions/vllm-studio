// CRITICAL
import { Activity, Server } from "lucide-react";

export function NoBackendState({
  error,
  isInitialLoading,
  loading,
  onRetry,
}: {
  error: string | null;
  isInitialLoading: boolean;
  loading: boolean;
  onRetry: () => void;
}) {
  return (
    <div className="mb-6 sm:mb-8">
      <div className="bg-[#1e1e1e] rounded-lg p-4 sm:p-6 border border-[#363432]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-sm text-[#f0ebe3]">
              {isInitialLoading ? (
                <Activity className="h-4 w-4 text-[#9a9088] animate-pulse" />
              ) : (
                <Server className="h-4 w-4 text-[#c9a66b]" />
              )}
              <span>{isInitialLoading ? "Checking controller connection…" : "No backend detected"}</span>
            </div>
            <p className="text-xs text-[#9a9088]">
              Configure the API connection above and click Test or Retry to load system details.
            </p>
            {error && !isInitialLoading && (
              <p className="text-[10px] text-[#c97a6b]">Last error: {error}</p>
            )}
          </div>
          <button
            onClick={onRetry}
            disabled={loading}
            className="px-3 py-1.5 bg-[#363432] rounded-lg text-xs text-[#f0ebe3] hover:bg-[#4a4846] disabled:opacity-50"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

