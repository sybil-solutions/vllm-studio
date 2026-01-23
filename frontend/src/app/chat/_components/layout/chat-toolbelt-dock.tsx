"use client";

import type { ReactNode } from "react";

interface ChatToolbeltDockProps {
  toolBelt: ReactNode;
  showEmptyState: boolean;
}

export function ChatToolbeltDock({ toolBelt, showEmptyState }: ChatToolbeltDockProps) {
  return (
    <div className="fixed left-0 right-0 bottom-0 z-20 md:static">
      <div className="md:hidden pb-[calc(env(safe-area-inset-bottom,0)+8px)] pt-2 bg-[hsl(30,5%,10.5%)]">
        {toolBelt}
      </div>
      {!showEmptyState && (
        <div className="hidden md:block shrink-0 pb-0 md:pb-3">{toolBelt}</div>
      )}
    </div>
  );
}
