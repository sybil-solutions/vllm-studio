// CRITICAL
import { withExecutingToolEnded, withExecutingToolStarted } from "@/lib/systems/tools/tool-tracker";
import { useAppStore } from "@/store";
import type { AgentPlan } from "@/lib/types";
import type { ChatMessage, ToolOutputDetails } from "@/lib/types/chat/chat";
import type { RunMachineEffect } from "./types";

export interface RunMachineEffectRuntime {
  setStreamStalled: (stalled: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setStreamError: (error: string | null) => void;
  setAgentPlan: (plan: AgentPlan | null) => void;

  setActiveRunId: (runId: string | null) => void;
  setRunCompleted: (value: boolean) => void;

  updateExecutingTools: (updater: (prev: Set<string>) => Set<string>) => void;
  recordToolExecutionMetadata: (toolCallId: string, toolName: string, input: unknown) => void;
  recordToolResult: (
    toolCallId: string,
    resultText: string,
    isError: boolean,
    outputDetails?: ToolOutputDetails,
  ) => void;

  upsertMessage: (message: ChatMessage) => void;
  setLastAssistantContent: (content: string) => void;

  loadAgentFiles: (options: { sessionId: string }) => Promise<unknown>;
  readAgentFile: (path: string, sessionIdOverride?: string | null) => Promise<unknown>;
  moveAgentFileVersions: (from: string, to: string) => void;

  generateTitle: (
    sessionId: string,
    userContent: string,
    assistantContent: string,
  ) => Promise<string | null>;

  pushStreamErrorToast: (message: string, context: { activeRunId: string | null; lastEventTime: number }) => void;

  /** Stops the SSE client + server run when a tool returns isError (agent mode). */
  abortAgentRunAfterToolError?: (detail: { toolName: string; resultText: string }) => void;

  setComputerBrowserUrl?: (url: string) => void;
}

export function applyRunMachineEffects(
  effects: RunMachineEffect[],
  runtime: RunMachineEffectRuntime,
) {
  for (const effect of effects) {
    switch (effect.type) {
      case "stream/clear-error": {
        runtime.setStreamError(null);
        useAppStore.getState().setLastRunDurationSeconds(null);
        break;
      }
      case "stream/set-stalled": {
        runtime.setStreamStalled(effect.stalled);
        break;
      }
      case "stream/set-loading": {
        runtime.setIsLoading(effect.loading);
        break;
      }
      case "stream/set-error": {
        runtime.setStreamError(effect.error);
        break;
      }
      case "stream/set-active-run-id": {
        runtime.setActiveRunId(effect.runId);
        break;
      }
      case "stream/set-run-completed": {
        runtime.setRunCompleted(effect.value);
        break;
      }
      case "stream/update-duration": {
        const start = useAppStore.getState().streamingStartTime;
        if (typeof start === "number" && start > 0) {
          const seconds = Math.max(0, Math.floor((Date.now() - start) / 1000));
          useAppStore.getState().setLastRunDurationSeconds(seconds);
          if (effect.runId) {
            useAppStore.getState().setRunDurationForRunId(effect.runId, seconds);
          }
        }
        break;
      }
      case "tools/clear-executing": {
        runtime.updateExecutingTools(() => new Set());
        break;
      }
      case "tools/start": {
        runtime.recordToolExecutionMetadata(effect.toolCallId, effect.toolName, effect.input);
        runtime.updateExecutingTools((prev) => withExecutingToolStarted(prev, effect.toolCallId));
        break;
      }
      case "tools/end": {
        runtime.updateExecutingTools((prev) => withExecutingToolEnded(prev, effect.toolCallId));
        runtime.recordToolResult(
          effect.toolCallId,
          effect.resultText,
          effect.isError,
          effect.outputDetails,
        );
        break;
      }
      case "messages/upsert": {
        runtime.upsertMessage(effect.message);
        break;
      }
      case "messages/turn-finished": {
        if (effect.message) {
          runtime.upsertMessage(effect.message);
        }
        if (effect.assistantContentForTitle) {
          runtime.setLastAssistantContent(effect.assistantContentForTitle);
        }
        for (const toolResult of effect.toolResults) {
          runtime.recordToolResult(
            toolResult.toolCallId,
            toolResult.resultText,
            toolResult.isError,
            toolResult.outputDetails,
          );
        }
        break;
      }
      case "plan/update": {
        runtime.setAgentPlan(effect.plan);
        break;
      }
      case "agent-files/list": {
        void runtime.loadAgentFiles({ sessionId: effect.sessionId });
        break;
      }
      case "agent-files/read": {
        void runtime.readAgentFile(effect.path, effect.sessionId).catch(() => {});
        break;
      }
      case "agent-files/move": {
        runtime.moveAgentFileVersions(effect.from, effect.to);
        break;
      }
      case "title/maybe-generate": {
        if (
          effect.sessionId &&
          (effect.currentTitle === "New Chat" || effect.currentTitle === "Chat") &&
          effect.lastUserInput
        ) {
          void runtime.generateTitle(
            effect.sessionId,
            effect.lastUserInput,
            effect.lastAssistantContent || "",
          );
        }
        break;
      }
      case "toast/stream-error": {
        runtime.pushStreamErrorToast(effect.message, {
          activeRunId: effect.activeRunId,
          lastEventTime: effect.lastEventTime,
        });
        break;
      }
      case "run/abort-after-tool-error": {
        runtime.abortAgentRunAfterToolError?.({
          toolName: effect.toolName,
          resultText: effect.resultText,
        });
        break;
      }
      case "computer-browser/set-url": {
        runtime.setComputerBrowserUrl?.(effect.url);
        break;
      }
      default:
        break;
    }
  }
}
