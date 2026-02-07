// CRITICAL
"use client";

import type { ReactNode } from "react";
import { ContextManagementProvider } from "@/lib/services/context-management";
import { MessageParsingProvider } from "@/lib/services/message-parsing";
import { useControllerEvents } from "@/hooks/use-controller-events";
import { ToastStack } from "@/components/shared";

function ControllerEventsListener() {
  useControllerEvents();
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MessageParsingProvider>
      <ContextManagementProvider>
        <ControllerEventsListener />
        <ToastStack />
        {children}
      </ContextManagementProvider>
    </MessageParsingProvider>
  );
}
