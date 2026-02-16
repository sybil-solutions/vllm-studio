// CRITICAL
import { RefreshCw, Settings } from "lucide-react";

export function ConfigsHeader({ loading, onReload }: { loading: boolean; onReload: () => void }) {
  return (
    <div className="flex items-center justify-between mb-6 sm:mb-8">
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-(--hl1)" />
        <h1 className="text-lg font-medium">System Configuration</h1>
      </div>
      <button
        onClick={onReload}
        disabled={loading}
        className="p-2 hover:bg-(--border) rounded-lg transition-colors"
      >
        <RefreshCw className={`h-4 w-4 text-(--dim) ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

