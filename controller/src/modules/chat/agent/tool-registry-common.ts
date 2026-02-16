// CRITICAL
import type { AgentToolResult } from "@mariozechner/pi-agent-core";
import type { TextContent } from "@mariozechner/pi-ai";

/**
 * Build a standard `AgentToolResult` with a single text block and optional details.
 * @param text - Result text content.
 * @param details - Optional structured details.
 * @returns Tool result payload.
 */
export const createTextResult = (
  text: string,
  details: Record<string, unknown> = {},
): AgentToolResult<Record<string, unknown>> => ({
  content: [{ type: "text", text } satisfies TextContent],
  details,
});

