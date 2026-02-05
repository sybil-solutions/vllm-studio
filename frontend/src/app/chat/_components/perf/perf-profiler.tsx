"use client";

import { Profiler, type ReactNode } from "react";

type PerfEntry = {
  id: string;
  phase: "mount" | "update" | "nested-update";
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
};

const MAX_ENTRIES = 200;

const recordPerfEntry = (entry: PerfEntry) => {
  if (process.env.NODE_ENV === "production") return;
  if (typeof window === "undefined") return;
  const store = ((window as unknown as { __vllmPerf?: { entries: PerfEntry[] } }).__vllmPerf ??=
    { entries: [] });
  store.entries.push(entry);
  if (store.entries.length > MAX_ENTRIES) {
    store.entries.splice(0, store.entries.length - MAX_ENTRIES);
  }
  if (window.localStorage?.getItem("vllm:profiler") === "1") {
    console.debug("[perf]", entry);
  }
};

export function PerfProfiler({ id, children }: { id: string; children: ReactNode }) {
  return (
    <Profiler
      id={id}
      onRender={(profileId, phase, actualDuration, baseDuration, startTime, commitTime) => {
        recordPerfEntry({
          id: profileId,
          phase,
          actualDuration,
          baseDuration,
          startTime,
          commitTime,
        });
      }}
    >
      {children}
    </Profiler>
  );
}
