// CRITICAL
export const TOOL_PENDING_STATES = new Set([
  "input-streaming",
  "input-available",
  "approval-requested",
  "approval-responded",
]);

export type ToolPart = {
  type: string;
  toolCallId: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  toolName?: string;
};

