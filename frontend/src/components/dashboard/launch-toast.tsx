interface LaunchToastProps {
  launching: boolean;
  launchProgress: {
    stage: "preempting" | "evicting" | "launching" | "waiting" | "ready" | "cancelled" | "error";
    message?: string;
    progress?: number;
  } | null;
}

export function LaunchToast({ launching, launchProgress }: LaunchToastProps) {
  if (!launching && !launchProgress) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 px-4 py-3 bg-(--card) border border-(--border)/50 rounded sm:max-w-xs"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-(--foreground) capitalize">
          {launchProgress?.stage === "error" || launchProgress?.stage === "cancelled" ? (
            <span className="text-(--error)">{launchProgress.stage}</span>
          ) : launchProgress?.stage === "ready" ? (
            <span className="text-(--success)">{launchProgress.stage}</span>
          ) : (
            launchProgress?.stage || "Starting..."
          )}
        </div>
        <div className="text-xs text-(--muted-foreground)">
          {launchProgress?.message || "Preparing model launch..."}
        </div>
      </div>
      {launchProgress?.progress != null &&
        launchProgress.stage !== "ready" &&
        launchProgress.stage !== "error" &&
        launchProgress.stage !== "cancelled" && (
          <div className="mt-3 h-0.5 bg-(--muted)/30 rounded-full overflow-hidden">
            <div
              className="h-full bg-(--foreground)/40 rounded-full transition-all duration-300"
              style={{ width: `${Math.round(launchProgress.progress * 100)}%` }}
            />
          </div>
        )}
    </div>
  );
}
