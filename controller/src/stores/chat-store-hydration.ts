// CRITICAL
import { parseJsonOrNull } from "../core/json";
import type { ChatMessage, ChatSessionSummary } from "../types/chat";
export { parseJsonOrNull };

/**
 * Hydrate a `chat_sessions` row by parsing `agent_state`.
 * @param row - Raw SQLite row.
 * @returns Hydrated row or null.
 */
export function hydrateSessionRow(row: Record<string, unknown> | null): ChatSessionSummary | null {
  if (!row) return null;
  const next: Record<string, unknown> = { ...row };
  if (typeof next["agent_state"] === "string") {
    next["agent_state"] = parseJsonOrNull(next["agent_state"]);
  }
  return next as ChatSessionSummary;
}

/**
 * Hydrate a `chat_messages` row by parsing JSON fields.
 * @param row - Raw SQLite row.
 * @returns Hydrated row.
 */
export function hydrateMessageRow(row: Record<string, unknown>): ChatMessage {
  const next: Record<string, unknown> = { ...row };
  if (typeof next["tool_calls"] === "string") {
    next["tool_calls"] = parseJsonOrNull(next["tool_calls"]);
  }
  if (typeof next["parts"] === "string") {
    next["parts"] = parseJsonOrNull(next["parts"]);
  }
  if (typeof next["metadata"] === "string") {
    next["metadata"] = parseJsonOrNull(next["metadata"]);
  }

  // Normalize known "array-ish" JSON columns to either an array or null.
  // This keeps downstream code from needing to guard against primitives/objects.
  if (next["tool_calls"] !== null && next["tool_calls"] !== undefined && !Array.isArray(next["tool_calls"])) {
    next["tool_calls"] = null;
  }
  if (next["parts"] !== null && next["parts"] !== undefined && !Array.isArray(next["parts"])) {
    next["parts"] = null;
  }

  return next as ChatMessage;
}
