// CRITICAL
"use client";

import { useEffect, type MutableRefObject } from "react";

export interface UseChatPageTimersArgs {
  isLoading: boolean;
  streamingStartTime: number | null;
  setStreamingStartTime: (next: number | null) => void;
  setElapsedSeconds: (next: number) => void;

  executingToolsSize: number;
  activeRunIdRef: MutableRefObject<string | null>;
  lastEventTimeRef: MutableRefObject<number>;
  setStreamStalled: (next: boolean) => void;
}

export function useChatPageTimers({
  isLoading,
  streamingStartTime,
  setStreamingStartTime,
  setElapsedSeconds,
  executingToolsSize,
  activeRunIdRef,
  lastEventTimeRef,
  setStreamStalled,
}: UseChatPageTimersArgs) {
  // Elapsed time timer - combined start time and interval logic
  useEffect(() => {
    if (isLoading) {
      if (streamingStartTime == null) {
        setStreamingStartTime(Date.now());
        return;
      }

      const intervalId = setInterval(
        () => setElapsedSeconds(Math.floor((Date.now() - streamingStartTime) / 1000)),
        1000,
      );
      return () => clearInterval(intervalId);
    }

    // Not loading - reset after delay
    const timeoutId = setTimeout(() => {
      setStreamingStartTime(null);
      setElapsedSeconds(0);
    }, 3000);
    return () => clearTimeout(timeoutId);
  }, [isLoading, setElapsedSeconds, setStreamingStartTime, streamingStartTime]);

  // Stream stall detection - warn user if no events for a while while loading (skip when tools run)
  // Keep dependency array size stable across fast refresh to avoid React dev warnings.
  const stallDepsKey = `${isLoading ? 1 : 0}-${executingToolsSize}`;
  useEffect(() => {
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const clearSoon = () => {
      clearTimer = setTimeout(() => setStreamStalled(false), 0);
    };

    if (!isLoading) {
      clearSoon();
      return () => {
        if (clearTimer) clearTimeout(clearTimer);
      };
    }

    if (executingToolsSize > 0) {
      clearSoon();
      return () => {
        if (clearTimer) clearTimeout(clearTimer);
      };
    }

    const STALL_THRESHOLD_MS = 60000; // 60 seconds
    const checkInterval = setInterval(() => {
      if (executingToolsSize > 0) {
        setStreamStalled(false);
        return;
      }
      if (lastEventTimeRef.current > 0 && activeRunIdRef.current) {
        const timeSinceLastEvent = Date.now() - lastEventTimeRef.current;
        if (timeSinceLastEvent >= STALL_THRESHOLD_MS) {
          setStreamStalled(true);
        }
      }
    }, 5000);

    return () => {
      clearInterval(checkInterval);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [stallDepsKey]);
}
