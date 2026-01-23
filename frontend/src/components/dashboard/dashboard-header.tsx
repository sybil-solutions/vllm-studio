import type { ProcessInfo, RecipeWithStatus } from "@/lib/types";

interface DashboardHeaderProps {
  currentProcess: ProcessInfo | null;
  currentRecipe: RecipeWithStatus | null;
  onNavigateChat: () => void;
  onNavigateLogs: () => void;
  onBenchmark: () => void;
  benchmarking: boolean;
  onStop: () => void;
}

export function DashboardHeader({
  currentProcess,
  currentRecipe,
  onNavigateChat,
  onNavigateLogs,
  onBenchmark,
  benchmarking,
  onStop,
}: DashboardHeaderProps) {
  const modelName = currentRecipe?.name || currentProcess?.model_path?.split("/").pop();

  return (
    <header className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1.5">
          {currentProcess ? (
            <>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="w-2 h-2 rounded-full bg-(--success)"></div>
                  <div className="absolute inset-0 w-2 h-2 rounded-full bg-(--success) animate-ping opacity-60"></div>
                </div>
                <h1 className="text-xl sm:text-2xl font-light tracking-tight text-(--foreground)">
                  {modelName}
                </h1>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-(--muted-foreground)/60 pl-5">
                <span className="font-medium">{currentProcess.backend}</span>
                <span className="opacity-40">·</span>
                <span className="tabular-nums">pid {currentProcess.pid}</span>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-(--muted)/40"></div>
                <h1 className="text-xl sm:text-2xl font-light tracking-tight text-(--muted-foreground)/60">
                  No model running
                </h1>
              </div>
              <p className="text-[10px] text-(--muted-foreground)/40 pl-5">
                Select a recipe to launch
              </p>
            </>
          )}
        </div>

        {currentProcess && (
          <nav className="flex items-center gap-4 text-xs">
            <button
              onClick={onNavigateChat}
              className="text-(--muted-foreground)/70 hover:text-(--foreground) transition-colors"
            >
              chat
            </button>
            <button
              onClick={onNavigateLogs}
              className="text-(--muted-foreground)/70 hover:text-(--foreground) transition-colors"
            >
              logs
            </button>
            <button
              onClick={onBenchmark}
              disabled={benchmarking}
              className="text-(--muted-foreground)/70 hover:text-(--foreground) transition-colors disabled:opacity-30 disabled:cursor-not-allowed hidden sm:block"
            >
              {benchmarking ? "running..." : "benchmark"}
            </button>
            <span className="text-(--border)/30">·</span>
            <button
              onClick={onStop}
              className="text-(--muted-foreground)/70 hover:text-(--error)/80 transition-colors"
            >
              stop
            </button>
          </nav>
        )}
      </div>
    </header>
  );
}
