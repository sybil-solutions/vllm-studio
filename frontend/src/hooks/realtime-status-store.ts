// CRITICAL
"use client";

import { useSyncExternalStore } from "react";
import type { GPU, Metrics, ProcessInfo } from "@/lib/types";
import api from "@/lib/api";

export interface StatusData {
  running: boolean;
  process: ProcessInfo | null;
  inference_port: number;
}

export interface LaunchProgressData {
  recipe_id: string;
  stage: "preempting" | "evicting" | "launching" | "waiting" | "ready" | "cancelled" | "error";
  message: string;
  progress?: number;
}

export interface RealtimeStatusSnapshot {
  status: StatusData | null;
  gpus: GPU[];
  metrics: Metrics | null;
  launchProgress: LaunchProgressData | null;
  lastEventAt: number;
}

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

function areProcessInfosEqual(a: ProcessInfo | null, b: ProcessInfo | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.pid === b.pid &&
    a.backend === b.backend &&
    a.model_path === b.model_path &&
    a.port === b.port &&
    (a.served_model_name ?? null) === (b.served_model_name ?? null)
  );
}

function areStatusEqual(a: StatusData | null, b: StatusData | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.running === b.running &&
    a.inference_port === b.inference_port &&
    areProcessInfosEqual(a.process, b.process)
  );
}

function areGpusEqual(a: GPU[], b: GPU[]) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (
      left.index !== right.index ||
      left.name !== right.name ||
      left.memory_total !== right.memory_total ||
      left.memory_used !== right.memory_used ||
      left.memory_free !== right.memory_free ||
      left.utilization !== right.utilization ||
      (left.temperature ?? null) !== (right.temperature ?? null) ||
      (left.power_draw ?? null) !== (right.power_draw ?? null) ||
      (left.power_limit ?? null) !== (right.power_limit ?? null)
    ) {
      return false;
    }
  }
  return true;
}

function areMetricsEqual(a: Metrics | null, b: Metrics | null) {
  if (a === b) return true;
  if (!a || !b) return false;

  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  for (const key of aKeys) {
    if (!(key in b)) return false;
    if ((a as Record<string, unknown>)[key] !== (b as Record<string, unknown>)[key]) return false;
  }

  return true;
}

function areLaunchProgressEqual(a: LaunchProgressData | null, b: LaunchProgressData | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.recipe_id === b.recipe_id &&
    a.stage === b.stage &&
    a.message === b.message &&
    (a.progress ?? null) === (b.progress ?? null)
  );
}

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
