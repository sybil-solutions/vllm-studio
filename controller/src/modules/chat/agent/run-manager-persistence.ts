// CRITICAL
import type { AssistantMessage, ToolResultMessage, Usage } from "@mariozechner/pi-ai";
import { Event } from "../../monitoring/event-manager";
import type { AppContext } from "../../../types/context";

/**
 * Convert model usage to stored usage format.
 * @param usage - Usage payload.
 * @returns Normalized usage or undefined.
 */
export function toLanguageUsage(
  usage: Usage | undefined
): { inputTokens: number; outputTokens: number; totalTokens: number } | undefined {
  if (!usage) return undefined;
  return {
    inputTokens: usage.input,
    outputTokens: usage.output,
    totalTokens: usage.totalTokens,
  };
}

/**
 * Extract a displayable string from a tool result.
 * @param result - Tool result content.
 * @returns Text content.
 */
export function extractToolResultText(result: unknown): string {
  if (Array.isArray(result)) {
    return result
      .filter(
        (item) =>
          item && typeof item === "object" && (item as Record<string, unknown>)["type"] === "text"
      )
      .map((item) => String((item as Record<string, unknown>)["text"] ?? ""))
      .join("\n");
  }
  if (result && typeof result === "object" && "content" in (result as Record<string, unknown>)) {
    const content = (result as Record<string, unknown>)["content"];
    return typeof content === "string" ? content : JSON.stringify(content);
  }
  return typeof result === "string" ? result : JSON.stringify(result ?? "");
}

/**
 * Persist an assistant message and tool calls to storage and publish websocket events.
 * @param context - Application context.
 * @param params - Persistence payload.
 * @param params.sessionId - Session identifier.
 * @param params.messageId - Message identifier.
 * @param params.assistant - Assistant message payload.
 * @param params.toolResults - Tool results for the turn.
 * @param params.runId - Run identifier.
 * @param params.turnIndex - Optional turn index for the message.
 * @returns void
 */
export function persistAssistantMessage(
  context: AppContext,
  params: {
    sessionId: string;
    messageId: string;
    assistant: AssistantMessage;
    toolResults: ToolResultMessage[];
    runId: string;
    turnIndex?: number;
  }
): void {
  const { sessionId, messageId, assistant, toolResults, runId, turnIndex } = params;

  const contentText = assistant.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  const toolResultsById = new Map<string, ToolResultMessage>();
  for (const result of toolResults) {
    toolResultsById.set(result.toolCallId, result);
  }

  const parts: Array<Record<string, unknown>> = [];
  const toolCalls: Array<Record<string, unknown>> = [];

  for (const block of assistant.content) {
    if (block.type === "text") {
      parts.push({ type: "text", text: block.text });
    } else if (block.type === "thinking") {
      parts.push({ type: "reasoning", text: block.thinking });
    } else if (block.type === "toolCall") {
      const toolCallId = block.id;
      const toolName = block.name;
      const input = block.arguments ?? {};

      parts.push({
        type: "dynamic-tool",
        toolCallId,
        toolName,
        input,
        state: "input-available",
      });

      const result = toolResultsById.get(toolCallId);
      if (result) {
        const resultText = extractToolResultText(result.content);
        if (result.isError) {
          parts[parts.length - 1] = {
            ...parts[parts.length - 1],
            state: "output-error",
            errorText: resultText,
          };
        } else {
          parts[parts.length - 1] = {
            ...parts[parts.length - 1],
            state: "output-available",
            output: resultText,
          };
        }
      }

      toolCalls.push({
        id: toolCallId,
        type: "function",
        function: {
          name: toolName,
          arguments: JSON.stringify(input),
        },
        ...(result
          ? {
              result: {
                content: extractToolResultText(result.content),
                isError: result.isError,
              },
            }
          : {}),
      });
    }
  }

  const usage = toLanguageUsage(assistant.usage);
  const metadata: Record<string, unknown> = {
    model: assistant.model,
    usage,
    runId,
  };
  if (typeof turnIndex === "number") {
    metadata["turnIndex"] = turnIndex;
  }

  context.stores.chatStore.addMessage(
    sessionId,
    messageId,
    "assistant",
    contentText,
    assistant.model,
    toolCalls.length > 0 ? toolCalls : undefined,
    usage?.inputTokens,
    undefined,
    usage?.totalTokens,
    usage?.outputTokens,
    parts,
    metadata
  );

  const sessionSummary = context.stores.chatStore.getSessionSummary(sessionId);
  context.eventManager.publish(
    new Event("chat_message_upserted", {
      session_id: sessionId,
      message: {
        id: messageId,
        role: "assistant",
        content: contentText,
        model: assistant.model,
        tool_calls: toolCalls,
        parts,
        metadata,
      },
      session: sessionSummary,
    })
  );
  const usageSummary = context.stores.chatStore.getUsage(sessionId);
  context.eventManager.publish(
    new Event("chat_usage_updated", { session_id: sessionId, usage: usageSummary })
  );
}
