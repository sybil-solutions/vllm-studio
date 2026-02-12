// CRITICAL
import type { GPU, LaunchProgressData, Metrics, ProcessInfo } from "@/lib/types";

export interface StatusData {
  running: boolean;
  process: ProcessInfo | null;
  inference_port: number;
}

export interface RealtimeStatusSnapshot {
  status: StatusData | null;
  gpus: GPU[];
  metrics: Metrics | null;
  launchProgress: LaunchProgressData | null;
  lastEventAt: number;
}

