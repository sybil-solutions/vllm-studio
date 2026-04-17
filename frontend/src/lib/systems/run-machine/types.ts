// CRITICAL
import type { ChatRunStreamEvent } from "@/lib/api";
import type { AgentPlan } from "@/lib/types";
import type { ChatMessage, ToolOutputDetails } from "@/lib/types/chat/chat";

export type RunPhase = "idle" | "active" | "completed";

export interface RunMachineState {
  phase: RunPhase;
  activeRunId: string | null;
  lastEventTime: number;
  runCompleted: boolean;
}

export interface RunMachineContext {
  currentSessionId: string | null;
  currentSessionTitle: string;
  lastUserInput: string;
  lastAssistantContent: string;
}

export interface RunMeta {
  runId?: string;
  turnIndex?: number;
}

export interface TurnResultEntry {
  toolCallId: string;
  resultText: string;
  isError: boolean;
  outputDetails?: ToolOutputDetails;
}

export type RunMachineEffect =
  | { type: "stream/clear-error" }
  | { type: "stream/set-stalled"; stalled: boolean }
  | { type: "stream/set-loading"; loading: boolean }
  | { type: "stream/set-error"; error: string | null }
  | { type: "stream/set-active-run-id"; runId: string | null }
  | { type: "stream/set-run-completed"; value: boolean }
  | { type: "stream/update-duration"; runId: string | null }
  | { type: "tools/clear-executing" }
  | { type: "tools/start"; toolCallId: string; toolName: string; input: unknown }
  | {
      type: "tools/end";
      toolCallId: string;
      resultText: string;
      isError: boolean;
      outputDetails?: ToolOutputDetails;
    }
  | { type: "messages/upsert"; message: ChatMessage }
  | {
      type: "messages/turn-finished";
      message?: ChatMessage;
      toolResults: TurnResultEntry[];
      assistantContentForTitle: string;
    }
  | {
      type: "plan/update";
      plan: AgentPlan;
    }
  | { type: "agent-files/list"; sessionId: string }
  | { type: "agent-files/read"; sessionId: string; path: string }
  | { type: "agent-files/move"; sessionId: string; from: string; to: string }
  | {
      type: "title/maybe-generate";
      sessionId: string | null;
      currentTitle: string;
      lastUserInput: string;
      lastAssistantContent: string;
    }
  | {
      type: "toast/stream-error";
      message: string;
      activeRunId: string | null;
      lastEventTime: number;
    }
  | { type: "run/abort-after-tool-error"; toolName: string; resultText: string }
  | { type: "computer-browser/set-url"; url: string };

export interface RunMachineTransitionResult {
  state: RunMachineState;
  effects: RunMachineEffect[];
}

export type RunMachineTransitionInput = {
  event: ChatRunStreamEvent;
  now: number;
  mapAgentMessageToChatMessage: (
    rawMessage: Record<string, unknown>,
    messageId: string | undefined,
    runMeta: RunMeta,
  ) => ChatMessage | null;
};
