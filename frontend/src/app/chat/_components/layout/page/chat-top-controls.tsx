"use client";

import { memo } from "react";
import { Menu, Settings } from "lucide-react";

interface ChatTopControlsProps {
  onOpenSidebar: () => void;
  onOpenSettings: () => void;
}

function ChatTopControlsBase({ onOpenSidebar, onOpenSettings }: ChatTopControlsProps) {
  return (
    <>
      <div className="fixed left-4 top-[calc(env(safe-area-inset-top,0)+16px)] z-20 md:hidden">
        <button
          onClick={onOpenSidebar}
          className="p-2 rounded-lg hover:bg-(--accent) transition-colors"
          title="Open navigation"
        >
          <Menu className="h-5 w-5 text-(--dim)" />
        </button>
      </div>
      <div className="fixed right-4 top-[calc(env(safe-area-inset-top,0)+16px)] z-20 md:hidden">
        <button
          onClick={onOpenSettings}
          className="p-2 rounded-lg hover:bg-(--accent) transition-colors"
          title="Chat settings"
        >
          <Settings className="h-5 w-5 text-(--dim)" />
        </button>
      </div>
    </>
  );
}

function areChatTopControlsPropsEqual(prev: ChatTopControlsProps, next: ChatTopControlsProps): boolean {
  return prev.onOpenSidebar === next.onOpenSidebar && prev.onOpenSettings === next.onOpenSettings;
}

export const ChatTopControls = memo(ChatTopControlsBase, areChatTopControlsPropsEqual);
