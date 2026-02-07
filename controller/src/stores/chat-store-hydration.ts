// CRITICAL
/**
 * Parse a JSON string, returning `null` on empty input or parse failure.
 * @param value - JSON string value.
 * @returns Parsed JSON value or null.
 */
export function parseJsonOrNull(value: unknown): unknown | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
}

/**
 * Hydrate a `chat_sessions` row by parsing `agent_state`.
 * @param row - Raw SQLite row.
 * @returns Hydrated row or null.
 */
export function hydrateSessionRow(row: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!row) return null;
  const next: Record<string, unknown> = { ...row };
  if (typeof next["agent_state"] === "string") {
    next["agent_state"] = parseJsonOrNull(next["agent_state"]);
  }
  return next;
}

/**
 * Hydrate a `chat_messages` row by parsing JSON fields.
 * @param row - Raw SQLite row.
 * @returns Hydrated row.
 */
export function hydrateMessageRow(row: Record<string, unknown>): Record<string, unknown> {
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
  return next;
}
