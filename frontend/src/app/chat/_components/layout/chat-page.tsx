// CRITICAL
"use client";

import { ChatPageView } from "./chat-page/view/chat-page-view";
import { useChatPageController } from "./chat-page/controller/use-chat-page-controller";

export function ChatPage() {
  const viewProps = useChatPageController();
  return (
    <ChatPageView {...viewProps} />
  );
}
