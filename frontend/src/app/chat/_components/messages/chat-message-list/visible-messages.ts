// CRITICAL
"use client";

import type { Artifact, ChatMessage } from "@/lib/types";
import { isToolCallOnlyText } from "@/app/chat/hooks/chat/use-chat-message-mapping/helpers";

export function hasNonEmptyText(message: ChatMessage): boolean {
  for (const part of message.parts ?? []) {
    if (!part || typeof part !== "object") continue;
    const type = (part as { type?: unknown }).type;
    if (type !== "text") continue;
    const text = (part as { text?: unknown }).text;
    if (typeof text === "string" && !isToolCallOnlyText(text) && text.trim().length > 0)
      return true;
  }
  return false;
}

/** Tool parts that produced a user-visible inline diff (file edit, sed command
 *  modifying a file, etc.) deserve to stay on the main thread — otherwise the
 *  assistant's actual change is hidden and only the narration survives. */
export function hasFileEditDiff(message: ChatMessage): boolean {
  for (const part of message.parts ?? []) {
    if (!part || typeof part !== "object") continue;
    const type = (part as { type?: unknown }).type;
    if (type !== "dynamic-tool" && typeof type === "string" && !type.startsWith("tool-")) continue;
    const details = (part as { outputDetails?: { before?: unknown; after?: unknown; changedFiles?: unknown } }).outputDetails;
    if (!details) continue;
    if (typeof details.before === "string" && typeof details.after === "string" && details.before !== details.after) {
      return true;
    }
    if (Array.isArray(details.changedFiles) && details.changedFiles.length > 0) {
      return true;
    }
  }
  return false;
}

/** True if any assistant message after the last user turn has visible (non-tool-only) text. */
export function currentRunAfterLastUserHasAssistantText(messages: ChatMessage[]): boolean {
  let lastUserIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role === "user") {
      lastUserIdx = i;
      break;
    }
  }
  if (lastUserIdx < 0) return false;
  for (let j = lastUserIdx + 1; j < messages.length; j++) {
    const m = messages[j];
    if (m?.role === "assistant" && hasNonEmptyText(m)) return true;
  }
  return false;
}

export function filterVisibleMessages({
  messages,
  isLoading,
  lastRawMessageId,
  artifactsByMessage,
}: {
  messages: ChatMessage[];
  isLoading: boolean;
  lastRawMessageId: string | undefined;
  artifactsByMessage?: Map<string, Artifact[]>;
}) {
  // During loading: find where the current agent run starts (first message after last user msg).
  // We only want to show the single live streaming message, not every intermediate turn.
  let currentRunStart = -1;
  if (isLoading) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "user") {
        currentRunStart = i + 1;
        break;
      }
    }
  }

  return messages.filter((m, idx) => {
    const metadata = m.metadata as { internal?: boolean } | undefined;
    if (metadata?.internal) return false;

    if (m.role !== "assistant") return true;

    // During loading: hide every current-run assistant message except the live streaming one.
    // This prevents intermediate tool-call turns from adding and removing height in the chat.
    if (currentRunStart >= 0 && idx >= currentRunStart) {
      // Intermediate tool turns that produced a file diff stay visible — the
      // diff is the substance of the turn and would otherwise vanish the
      // moment the final text message starts streaming.
      if (m.id !== lastRawMessageId && !hasFileEditDiff(m)) return false;
      // Keep the live assistant row mounted for the whole stream (including before the
      // first visible text token). Otherwise the list collapses and Virtuoso snaps to top.
      if (isLoading) return true;
      // Completed: require visible content; tool-only turns stay in Computer.
      return hasNonEmptyText(m) || hasFileEditDiff(m);
    }

    // Completed messages: main thread is user-visible text (and artifacts). Tool + reasoning
    // steps stay in Activity / Computer — listing them here duplicated noise and hurt scrolling UX.
    if (hasNonEmptyText(m)) return true;
    const hasArtifacts = Boolean(artifactsByMessage?.get(m.id)?.length);
    if (hasArtifacts) return true;
    // Exception: tool messages that produced a file diff stay visible — the
    // diff is the substance of the turn, hiding it leaves the user with only
    // the assistant's narration ("changed X to Y") and no way to see the
    // actual change.
    if (hasFileEditDiff(m)) return true;
    return false;
  });
}
