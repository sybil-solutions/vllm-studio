// CRITICAL
import type { AgentEvent, AgentMessage } from "@mariozechner/pi-agent-core";
import type { AssistantMessage, ToolResultMessage } from "@mariozechner/pi-ai";

export type ToolExecutionInfo = {
  toolName: string;
  args: Record<string, unknown>;
  startedAt: string;
};

export type AgentEventHandlerHelpers = {
  runId: string;
  sessionId: string;
  publish: (type: string, data: Record<string, unknown>) => void;
  toolExecutionStarts: Map<string, ToolExecutionInfo>;
  toolCallToMessageId: Map<string, string>;
  userMessageId: string;
  setAssistantId: (id: string | null) => void;
  setLastAssistantId: (id: string | null) => void;
  getAssistantId: () => string | null;
  getLastAssistantId: () => string | null;
  cleanMessage: (message: AgentMessage) => void;
  getTurnIndex: () => number;
  setTurnIndex: (value: number) => void;
  markError: (message: string, status: "error" | "aborted") => void;
};

export type AgentEventHandlerOptions = {
  createMessageId: () => string;
  mapToolCallsToMessage: (
    assistant: AssistantMessage,
    messageId: string | null,
    toolCallToMessageId: Map<string, string>,
  ) => void;
  persistAssistantMessage: (
    sessionId: string,
    messageId: string,
    assistant: AssistantMessage,
    toolResults: ToolResultMessage[],
    runId: string,
    turnIndex?: number,
  ) => void;
  addToolExecution: (
    runId: string,
    toolCallId: string,
    toolName: string,
    options: {
      arguments: Record<string, unknown>;
      resultText: string;
      isError: boolean;
      finishedAt: string;
      startedAt?: string;
      toolServer?: string;
    },
  ) => void;
  parseToolServer: (toolName: string) => string | null;
  extractToolResultText: (result: unknown) => string;
};

/**
 * Translate Pi agent runtime events into controller SSE events and persisted side effects.
 * @param event - Agent event payload.
 * @param helpers - Helper callbacks and mutable state for the run.
 * @param options - Side-effect callbacks for persistence and tool execution tracking.
 * @returns Nothing.
 */
export function handleAgentEvent(
  event: AgentEvent,
  helpers: AgentEventHandlerHelpers,
  options: AgentEventHandlerOptions,
): void {
  switch (event.type) {
    case "turn_start": {
      const nextIndex = helpers.getTurnIndex() + 1;
      helpers.setTurnIndex(nextIndex);
      helpers.publish("turn_start", { ...(event as Record<string, unknown>), turn_index: nextIndex });
      return;
    }
    case "message_start": {
      const message = event.message as AgentMessage;
      const turnIndex = helpers.getTurnIndex();
      const turnPayload = turnIndex >= 0 ? { turn_index: turnIndex } : {};
      if (message.role === "assistant") {
        const id = options.createMessageId();
        helpers.setAssistantId(id);
        helpers.publish("message_start", { message_id: id, message, ...turnPayload });
        return;
      }
      if (message.role === "user") {
        helpers.publish("message_start", { message_id: helpers.userMessageId, message, ...turnPayload });
        return;
      }
      helpers.publish("message_start", { message, ...turnPayload });
      return;
    }
    case "message_update": {
      const message = event.message as AgentMessage;
      helpers.cleanMessage(message);
      const messageId = message.role === "assistant" ? helpers.getAssistantId() : undefined;
      const turnIndex = helpers.getTurnIndex();
      const turnPayload = turnIndex >= 0 ? { turn_index: turnIndex } : {};
      helpers.publish("message_update", {
        ...(messageId ? { message_id: messageId } : {}),
        message,
        assistantMessageEvent: event.assistantMessageEvent,
        ...turnPayload,
      });
      return;
    }
    case "message_end": {
      const message = event.message as AgentMessage;
      helpers.cleanMessage(message);
      const turnIndex = helpers.getTurnIndex();
      const turnPayload = turnIndex >= 0 ? { turn_index: turnIndex } : {};
      if (message.role === "assistant") {
        const messageId = helpers.getAssistantId();
        helpers.setLastAssistantId(messageId);
        options.mapToolCallsToMessage(message as AssistantMessage, messageId, helpers.toolCallToMessageId);
        helpers.publish("message_end", { ...(messageId ? { message_id: messageId } : {}), message, ...turnPayload });
        return;
      }
      if (message.role === "user") {
        helpers.publish("message_end", { message_id: helpers.userMessageId, message, ...turnPayload });
        return;
      }
      helpers.publish("message_end", { message, ...turnPayload });
      return;
    }
    case "tool_execution_start": {
      const turnIndex = helpers.getTurnIndex();
      const turnPayload = turnIndex >= 0 ? { turn_index: turnIndex } : {};
      helpers.toolExecutionStarts.set(event.toolCallId, {
        toolName: event.toolName,
        args: event.args ?? {},
        startedAt: new Date().toISOString(),
      });
      helpers.publish("tool_execution_start", {
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
        message_id: helpers.toolCallToMessageId.get(event.toolCallId),
        ...turnPayload,
      });
      return;
    }
    case "tool_execution_update": {
      const turnIndex = helpers.getTurnIndex();
      const turnPayload = turnIndex >= 0 ? { turn_index: turnIndex } : {};
      helpers.publish("tool_execution_update", {
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        args: event.args,
        partialResult: event.partialResult,
        message_id: helpers.toolCallToMessageId.get(event.toolCallId),
        ...turnPayload,
      });
      return;
    }
    case "tool_execution_end": {
      const turnIndex = helpers.getTurnIndex();
      const turnPayload = turnIndex >= 0 ? { turn_index: turnIndex } : {};
      const started = helpers.toolExecutionStarts.get(event.toolCallId);
      const finishedAt = new Date().toISOString();
      const toolServer = options.parseToolServer(event.toolName);
      const toolExecutionOptions = {
        arguments: started?.args ?? {},
        resultText: options.extractToolResultText(event.result?.content ?? event.result),
        isError: event.isError,
        finishedAt,
        ...(toolServer ? { toolServer } : {}),
        ...(started?.startedAt ? { startedAt: started.startedAt } : {}),
      };

      options.addToolExecution(helpers.runId, event.toolCallId, event.toolName, toolExecutionOptions);
      helpers.publish("tool_execution_end", {
        toolCallId: event.toolCallId,
        toolName: event.toolName,
        result: event.result,
        isError: event.isError,
        message_id: helpers.toolCallToMessageId.get(event.toolCallId),
        ...turnPayload,
      });
      return;
    }
    case "turn_end": {
      const assistant = event.message as AssistantMessage;
      helpers.cleanMessage(assistant as unknown as AgentMessage);
      const messageId = helpers.getLastAssistantId();
      const turnIndex = helpers.getTurnIndex();
      const turnPayload = turnIndex >= 0 ? { turn_index: turnIndex } : {};
      if (assistant.stopReason === "error" || assistant.stopReason === "aborted") {
        helpers.markError(
          assistant.errorMessage ?? "Agent error",
          assistant.stopReason === "aborted" ? "aborted" : "error",
        );
      }
      if (messageId) {
        options.persistAssistantMessage(
          helpers.sessionId,
          messageId,
          assistant,
          event.toolResults ?? [],
          helpers.runId,
          turnIndex >= 0 ? turnIndex : undefined,
        );
      }
      helpers.publish("turn_end", {
        message: assistant,
        toolResults: event.toolResults ?? [],
        message_id: messageId,
        ...turnPayload,
      });
      return;
    }
    case "agent_end":
    case "agent_start":
    default:
      helpers.publish(event.type, { ...(event as Record<string, unknown>) });
  }
}
