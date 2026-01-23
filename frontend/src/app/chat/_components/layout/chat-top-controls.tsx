"use client";

import { Menu, Settings } from "lucide-react";

interface ChatTopControlsProps {
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

export function ChatTopControls({ onOpenSidebar, onOpenSettings }: ChatTopControlsProps) {
  return (
    <>
      <div className="fixed left-4 top-[calc(env(safe-area-inset-top,0)+16px)] z-20 md:hidden">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg hover:bg-(--accent) transition-colors"
          title="Open navigation"
        >
          <Menu className="h-5 w-5 text-[#9a9590]" />
        </button>
      </div>
      <div className="fixed right-4 top-[calc(env(safe-area-inset-top,0)+16px)] z-20 md:hidden">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg hover:bg-(--accent) transition-colors"
          title="Chat settings"
        >
          <Settings className="h-5 w-5 text-[#9a9590]" />
        </button>
      </div>
    </>
  );
}
