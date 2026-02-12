// CRITICAL
"use client";

import { useEffect, useRef, type RefObject } from "react";

type Args = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  value: string;
  isLoading: boolean | undefined;
  queuedContext: string;
};

export function useAutosizeTextarea({ textareaRef, value, isLoading, queuedContext }: Args) {
  const baseHeightRef = useRef<number>(44);
  const lastShouldCapRef = useRef<boolean | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";
    const scrollHeight = textarea.scrollHeight;
    const shouldCap = window.innerWidth >= 768;

    // `getComputedStyle` can be surprisingly expensive; only re-read when the breakpoint flips.
    if (lastShouldCapRef.current !== shouldCap) {
      lastShouldCapRef.current = shouldCap;
      const minHeight = Number.parseFloat(window.getComputedStyle(textarea).minHeight);
      baseHeightRef.current =
        Number.isFinite(minHeight) && minHeight > 0 ? minHeight : shouldCap ? 44 : 52;
    }

    const baseHeight = baseHeightRef.current;
    const newHeight = shouldCap
      ? Math.min(Math.max(scrollHeight, baseHeight), 200)
      : Math.max(scrollHeight, baseHeight);
    textarea.style.height = newHeight + "px";
    textarea.style.overflowY = shouldCap && scrollHeight > 200 ? "auto" : "hidden";
  }, [value, isLoading, queuedContext, textareaRef]);
}

