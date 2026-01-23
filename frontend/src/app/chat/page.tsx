"use client";

import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import { ChatPage } from "./_components/layout/chat-page";

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="animate-pulse-soft">
        <Sparkles className="h-8 w-8 text-[#9a9590]" />
      </div>
    </div>
  );
}

export default function ChatV2Page() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ChatPage />
    </Suspense>
  );
}
