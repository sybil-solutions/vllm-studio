// CRITICAL
import { useMemo } from "react";
import { useRealtimeStatusStore } from "./realtime-status-store";

/**
 * Hook for real-time status updates.
 *
 * Data is sourced from the global controller SSE connection (see `useControllerEvents`),
 * with polling fallback if SSE is blocked.
 */
export function useRealtimeStatus() {
  const snap = useRealtimeStatusStore();
  const connected = Boolean(snap.status);

  // Preserve the old return shape to avoid touching call sites.
  return useMemo(
    () => ({
      status: snap.status,
      gpus: snap.gpus,
      metrics: snap.metrics,
      launchProgress: snap.launchProgress,
      isConnected: connected,
      error: null,
      reconnectAttempts: 0,
    }),
    [connected, snap.gpus, snap.launchProgress, snap.metrics, snap.status],
  );
}
