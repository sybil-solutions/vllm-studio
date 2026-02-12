// CRITICAL
"use client";

import { useEffect, useRef } from "react";
import { useRafThrottle } from "../ui/use-raf-throttle";

type UseChatScrollArgs = {
  isLoading: boolean;
  messageCount: number;
};

export function useChatScroll({ isLoading, messageCount }: UseChatScrollArgs): {
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  messagesContainerRef: React.RefObject<HTMLDivElement | null>;
  handleScroll: () => void;
} {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const userScrolledUpRef = useRef(false);

  const handleScroll = useRafThrottle(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
    userScrolledUpRef.current = distanceFromBottom >= 160;
  });

  const prevMessageCountRef = useRef(messageCount);
  useEffect(() => {
    // Only scroll when message count changes (new message added) or loading state changes.
    if (messageCount === prevMessageCountRef.current && isLoading) return;
    prevMessageCountRef.current = messageCount;

    if (!userScrolledUpRef.current) {
      messagesEndRef.current?.scrollIntoView({
        behavior: isLoading ? "auto" : "smooth",
      });
    }
  }, [isLoading, messageCount]);

  // While streaming, the last assistant message grows without changing `messageCount`.
  // Keep the view pinned to bottom unless the user has scrolled up.
  const streamingScrollHeightRef = useRef<number>(0);
  useEffect(() => {
    if (!isLoading) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    streamingScrollHeightRef.current = container.scrollHeight;

    const tick = () => {
      const c = messagesContainerRef.current;
      if (!c) return;
      const nextHeight = c.scrollHeight;
      if (nextHeight !== streamingScrollHeightRef.current) {
        streamingScrollHeightRef.current = nextHeight;
        if (!userScrolledUpRef.current) {
          messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
        }
      }
    };

    const interval = window.setInterval(tick, 120);
    return () => window.clearInterval(interval);
  }, [isLoading]);

  return {
    messagesEndRef,
    messagesContainerRef,
    handleScroll,
  };
}
