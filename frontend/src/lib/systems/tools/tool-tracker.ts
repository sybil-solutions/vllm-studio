// CRITICAL
import { safeJsonStringify } from "@/lib/safe-json";
import type { ToolOutputDetails, ToolResult } from "@/lib/types";

export function extractToolResultText(result: unknown): string {
  if (result == null) return "";
  if (typeof result === "string") return result;
  if (Array.isArray(result)) {
    return result
      .filter(
        (item) =>
          item &&
          typeof item === "object" &&
          (item as Record<string, unknown>)["type"] === "text",
      )
      .map((item) => String((item as Record<string, unknown>)["text"] ?? ""))
      .join("\n");
  }
  if (typeof result === "object") {
    const record = result as Record<string, unknown>;
    if (Array.isArray(record["content"])) {
      return extractToolResultText(record["content"]);
    }
    if (typeof record["text"] === "string") {
      return record["text"];
    }
    return safeJsonStringify(record, "");
  }
  return String(result);
}

export function withToolExecutionStart(
  prev: Map<string, ToolResult>,
  toolCallId: string,
  toolName: string,
  input: unknown,
): Map<string, ToolResult> {
  const next = new Map(prev);
  const existing = next.get(toolCallId);
  next.set(toolCallId, {
    tool_call_id: toolCallId,
    content: existing?.content ?? "",
    name: toolName,
    input,
    ...(existing?.isError !== undefined ? { isError: existing.isError } : {}),
  });
  return next;
}

export function withToolExecutionEnd(
  prev: Map<string, ToolResult>,
  toolCallId: string,
  resultText: string,
  isError: boolean,
  outputDetails?: ToolOutputDetails,
): Map<string, ToolResult> {
  const next = new Map(prev);
  const existing = next.get(toolCallId);
  const payload: ToolResult = {
    tool_call_id: toolCallId,
    content: resultText,
    ...(existing?.name ? { name: existing.name } : {}),
    ...(existing?.input !== undefined ? { input: existing.input } : {}),
    isError,
    ...(outputDetails ? { outputDetails } : {}),
  };
  next.set(toolCallId, payload);
  return next;
}

export function withExecutingToolStarted(prev: Set<string>, toolCallId: string): Set<string> {
  const next = new Set(prev);
  next.add(toolCallId);
  return next;
}

export function withExecutingToolEnded(prev: Set<string>, toolCallId: string): Set<string> {
  const next = new Set(prev);
  next.delete(toolCallId);
  return next;
}
