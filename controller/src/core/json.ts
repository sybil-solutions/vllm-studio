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

