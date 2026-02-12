// CRITICAL
"use client";

import { useEffect, type RefObject } from "react";

export function useComposerHeightCssVar<T extends HTMLElement>(rootRef: RefObject<T | null>) {
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    const update = () => {
      const height = Math.ceil(node.getBoundingClientRect().height);
      if (height > 0) {
        document.documentElement.style.setProperty("--chat-composer-height", `${height}px`);
      }
    };

    update();
    const ro = new ResizeObserver(() => update());
    ro.observe(node);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [rootRef]);
}
