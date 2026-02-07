// CRITICAL
"use client";

import { ChatPageView } from "./chat-page/chat-page-view";
import { useChatPageController } from "./chat-page/use-chat-page-controller";

export function ChatPage() {
  const viewProps = useChatPageController();
  return (
    <ChatPageView {...viewProps} />
  );
}
