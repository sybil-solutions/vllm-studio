// CRITICAL
"use client";

import { useSyncExternalStore } from "react";
import type { GPU, LaunchProgressData, Metrics, ProcessInfo } from "@/lib/types";
import api from "@/lib/api";
import type { RealtimeStatusSnapshot } from "./realtime-status-store/types";
import { areGpusEqual, areLaunchProgressEqual, areMetricsEqual, areStatusEqual } from "./realtime-status-store/equality";

const initialSnapshot: RealtimeStatusSnapshot = {
  status: null,
  gpus: [],
  metrics: null,
  launchProgress: null,
  lastEventAt: 0,
};

let snapshot: RealtimeStatusSnapshot = initialSnapshot;
const listeners = new Set<() => void>();
let started = false;
let pollInterval: ReturnType<typeof setInterval> | null = null;
let clearLaunchTimer: ReturnType<typeof setTimeout> | null = null;

function emitIfChanged(next: RealtimeStatusSnapshot) {
  const changed =
    !areStatusEqual(snapshot.status, next.status) ||
    !areGpusEqual(snapshot.gpus, next.gpus) ||
    !areMetricsEqual(snapshot.metrics, next.metrics) ||
    !areLaunchProgressEqual(snapshot.launchProgress, next.launchProgress);

  snapshot = changed ? next : { ...snapshot, lastEventAt: next.lastEventAt };
  if (!changed) return;

  for (const l of listeners) l();
}

function scheduleLaunchClear(stage: LaunchProgressData["stage"]) {
  if (clearLaunchTimer) {
    clearTimeout(clearLaunchTimer);
    clearLaunchTimer = null;
  }
  if (stage === "ready" || stage === "error" || stage === "cancelled") {
    clearLaunchTimer = setTimeout(() => {
      emitIfChanged({
        ...snapshot,
        launchProgress: null,
        lastEventAt: Date.now(),
      });
    }, 5000);
  }
}

async function fetchStatusNow() {
  try {
    const [{ running, process, inference_port }] = await Promise.all([
      api.getStatus(),
      api.getHealth().catch(() => null),
    ]);

    let gpus: GPU[] = snapshot.gpus;
    try {
      const { gpus: gpuList } = await api.getGPUs();
      gpus = gpuList ?? [];
    } catch {
      // ignore
    }

    emitIfChanged({
      status: { running, process, inference_port },
      gpus,
      metrics: snapshot.metrics,
      launchProgress: snapshot.launchProgress,
      lastEventAt: Date.now(),
    });
  } catch {
    // ignore; keep last known values
  }
}

function start() {
  if (started) return;
  started = true;
  if (typeof window === "undefined") return;

  const onControllerEvent = (event: Event) => {
    const custom = event as CustomEvent<{ type?: string; data?: Record<string, unknown> }>;
    const type = custom.detail?.type;
    const data = custom.detail?.data ?? {};

    const now = Date.now();

    if (type === "status") {
      const running = Boolean(data["running"] ?? data["process"]);
      const process = (data["process"] ?? null) as ProcessInfo | null;
      const inference_port = Number(data["inference_port"] ?? 8000);
      emitIfChanged({
        status: { running, process, inference_port },
        gpus: snapshot.gpus,
        metrics: snapshot.metrics,
        launchProgress: snapshot.launchProgress,
        lastEventAt: now,
      });
      return;
    }

    if (type === "gpu") {
      const list = (data["gpus"] ?? []) as GPU[];
      emitIfChanged({
        status: snapshot.status,
        gpus: Array.isArray(list) ? list : [],
        metrics: snapshot.metrics,
        launchProgress: snapshot.launchProgress,
        lastEventAt: now,
      });
      return;
    }

    if (type === "metrics") {
      emitIfChanged({
        status: snapshot.status,
        gpus: snapshot.gpus,
        metrics: data as Metrics,
        launchProgress: snapshot.launchProgress,
        lastEventAt: now,
      });
      return;
    }

    if (type === "launch_progress") {
      const progress = data as unknown as LaunchProgressData;
      scheduleLaunchClear(progress.stage);
      emitIfChanged({
        status: snapshot.status,
        gpus: snapshot.gpus,
        metrics: snapshot.metrics,
        launchProgress: progress,
        lastEventAt: now,
      });
      return;
    }
  };

  window.addEventListener("vllm:controller-event", onControllerEvent as EventListener);

  // Initial fetch + polling fallback in case SSE is blocked.
  void fetchStatusNow();
  pollInterval = setInterval(() => {
    if (Date.now() - snapshot.lastEventAt < 10_000) return;
    void fetchStatusNow();
  }, 5000);

  const onVisibility = () => {
    if (document.visibilityState === "visible") {
      void fetchStatusNow();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onPageShow = (e: PageTransitionEvent) => {
    if (e.persisted) void fetchStatusNow();
  };
  window.addEventListener("pageshow", onPageShow);
}

export function useRealtimeStatusStore(): RealtimeStatusSnapshot {
  start();
  return useSyncExternalStore(
    (onStoreChange) => {
      listeners.add(onStoreChange);
      return () => listeners.delete(onStoreChange);
    },
    () => snapshot,
    () => initialSnapshot,
  );
}
