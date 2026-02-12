"use client";

import { useCallback, useEffect, useRef } from "react";

export function useRafThrottle<T extends (...args: never[]) => void>(callback: T) {
  const frameRef = useRef<number | null>(null);
  const lastArgsRef = useRef<Parameters<T> | null>(null);

  const throttled = useCallback(
    (...args: Parameters<T>) => {
      lastArgsRef.current = args;
      if (frameRef.current != null) return;
      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        if (lastArgsRef.current) {
          callback(...lastArgsRef.current);
        }
      });
    },
    [callback],
  );

  useEffect(() => {
    return () => {
      if (frameRef.current != null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return throttled;
}
