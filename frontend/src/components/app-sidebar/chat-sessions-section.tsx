// CRITICAL
"use client";

import Link from "next/link";
import { ChevronDown, Plus } from "lucide-react";
import type { ChatSession } from "@/lib/types";

export function ChatSessionsSection({
  sessions,
  open,
  setOpen,
  isMobile,
  onCloseMobile,
  onNewChat,
}: {
  sessions: ChatSession[];
  open: boolean;
  setOpen: (next: boolean) => void;
  isMobile: boolean;
  onCloseMobile: () => void;
  onNewChat: () => void;
}) {
  if (sessions.length === 0) {
    return (
      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm font-medium mb-2"
      >
        <Plus className="w-4 h-4" />
        New Chat
      </button>
    );
  }

  return (
    <div className="ml-2 mt-2 mb-2">
      <button
        onClick={onNewChat}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/15 rounded-lg transition-colors text-sm font-medium mb-2"
      >
        <Plus className="w-4 h-4" />
        New Chat
      </button>

      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-1.5 text-[#9a9590] hover:text-[#b0a8a0] text-xs font-medium transition-colors"
      >
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        <span>Your chats</span>
      </button>

      {open && (
        <div className="space-y-0.5 max-h-96 overflow-y-auto ml-4 pr-1 scrollbar-thin">
          {sessions.map((session) => {
            let displayTitle = session.title;
            if (!displayTitle || displayTitle === "New Chat") {
              if (session.first_user_message) {
                const words = session.first_user_message.trim().split(/\s+/).slice(0, 5);
                displayTitle = words.join(" ") + (words.length >= 5 ? "..." : "");
              } else {
                displayTitle = "New Chat";
              }
            }
            return (
              <Link
                key={session.id}
                href={`/chat?session=${session.id}`}
                onClick={() => {
                  if (isMobile) onCloseMobile();
                }}
                className="block px-3 py-1.5 text-xs text-[#9a9590] hover:text-[#b0a8a0] hover:bg-(--accent)/10 rounded transition-colors truncate"
                title={displayTitle}
              >
                {displayTitle}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
