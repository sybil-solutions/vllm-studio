// CRITICAL
import { randomUUID } from "node:crypto";
import type { AgentMessage, ThinkingLevel } from "@mariozechner/pi-agent-core";
import { Agent } from "@mariozechner/pi-agent-core";
import type { AssistantMessage } from "@mariozechner/pi-ai";
import { AsyncQueue } from "../../core/async";
import { cleanUtf8StreamContent, type Utf8State } from "../proxy-parsers";
import type { AppContext } from "../../types/context";
import { handleAgentEvent, type ToolExecutionInfo } from "./agent-event-handler";
import { createOpenAiCompatibleModel } from "./model-factory";
import { buildAgentTools } from "./tool-registry";
import { mapAgentMessagesToLlm, mapStoredMessagesToAgentMessages } from "./message-mapper";
import { streamOpenAiCompletionsSafe } from "./stream-openai-completions-safe";
import { buildSystemPrompt } from "./system-prompt-builder";
import { persistAssistantMessage, extractToolResultText } from "./run-manager-persistence";
import { createRunPublisher, createSseStream } from "./run-manager-sse";

export interface ChatRunOptions {
  sessionId: string;
  messageId?: string;
  content: string;
  model?: string;
  systemPrompt?: string;
  mcpEnabled?: boolean;
  agentMode?: boolean;
  agentFiles?: boolean;
  deepResearch?: boolean;
  thinkingLevel?: ThinkingLevel;
}

export interface ChatRunStream {
  runId: string;
  stream: AsyncIterable<string>;
}

/**
 * Controller-owned run manager for Pi agent sessions.
 */
export class ChatRunManager {
  private readonly context: AppContext;
  private readonly activeRuns = new Map<string, { agent: Agent; abort: AbortController }>();

  /**
   * Create a run manager.
   * @param context - Application context.
   */
  public constructor(context: AppContext) {
    this.context = context;
  }

  /**
   * Abort an in-flight run.
   * @param runId - Run identifier.
   * @returns True if a run was aborted.
   */
  public abortRun(runId: string): boolean {
    const active = this.activeRuns.get(runId);
    if (!active) {
      return false;
    }
    active.agent.abort();
    active.abort.abort();
    return true;
  }

  /**
   * Start a new chat run and return the SSE stream.
   * @param options - Run options.
   * @returns Run id and stream iterable.
   */
  public async startRun(options: ChatRunOptions): Promise<ChatRunStream> {
    const sessionId = options.sessionId;
    const session = this.context.stores.chatStore.getSession(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    const content = options.content.trim();
    if (!content) {
      throw new Error("Message content is required");
    }

    if (this.isMockInferenceEnabled()) {
      return this.startMockRun(session, options, content);
    }

    const modelId = await this.resolveModelId(session, options.model);
    const systemPrompt = buildSystemPrompt(session, options.systemPrompt, options.agentMode ?? false);
    const thinkingLevel = options.thinkingLevel ?? (options.deepResearch ? "high" : "off");
    const baseUrl = `http://localhost:${this.context.config.port}/v1`;
    const model = createOpenAiCompatibleModel(modelId, baseUrl);

    const history = Array.isArray(session["messages"]) ? (session["messages"] as Array<Record<string, unknown>>) : [];
    const agentMessages = mapStoredMessagesToAgentMessages(history, model);

    const runId = randomUUID();
    const userMessageId = options.messageId ?? randomUUID();
    const userMetadata = { runId };
    this.context.stores.chatStore.addMessage(
      sessionId,
      userMessageId,
      "user",
      content,
      modelId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [{ type: "text", text: content }],
      userMetadata,
    );

    const runOptions = {
      userMessageId,
      model: modelId,
      status: "running",
      ...(systemPrompt ? { system: systemPrompt } : {}),
      ...(options.mcpEnabled || options.agentMode || options.agentFiles ? { toolsetId: "agent" } : {}),
    };

    this.context.stores.chatStore.createRun(runId, sessionId, runOptions);

    const queue = new AsyncQueue<string>(200);
    const abort = new AbortController();
    const agent = new Agent({
      initialState: {
        model,
        systemPrompt: systemPrompt ?? "",
        thinkingLevel,
        tools: [],
        messages: agentMessages,
      },
      convertToLlm: mapAgentMessagesToLlm,
      streamFn: streamOpenAiCompletionsSafe,
      getApiKey: (): string => this.resolveApiKey(),
      maxRetryDelayMs: 60_000,
    });
    agent.sessionId = sessionId;

    this.activeRuns.set(runId, { agent, abort });

    const toolExecutionStarts = new Map<string, ToolExecutionInfo>();
    const toolCallToMessageId = new Map<string, string>();
    let currentAssistantMessageId: string | null = null;
    let lastAssistantMessageId: string | null = null;
    let runStatus: "completed" | "error" | "aborted" = "completed";
    let runError: string | null = null;
    let turnIndex = -1;

    const utf8State: Utf8State = { pendingContent: "", pendingReasoning: "" };
    const cleanMessage = (message: AgentMessage): void => {
      if (!message || message.role !== "assistant") return;
      const assistant = message as AssistantMessage;
      const content = Array.isArray(assistant.content) ? assistant.content : null;
      if (!content) return;
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        if (block.type === "text" && typeof (block as { text?: unknown }).text === "string") {
          const cleaned = cleanUtf8StreamContent((block as { text: string }).text, utf8State);
          (block as { text: string }).text = cleaned;
          continue;
        }
        if (block.type === "thinking" && typeof (block as { thinking?: unknown }).thinking === "string") {
          const reasoningState = { pendingContent: utf8State.pendingReasoning, pendingReasoning: "" };
          const cleaned = cleanUtf8StreamContent((block as { thinking: string }).thinking, reasoningState);
          utf8State.pendingReasoning = reasoningState.pendingContent;
          (block as { thinking: string }).thinking = cleaned;
        }
      }
    };

    const { publish } = createRunPublisher(this.context, { runId, sessionId, queue });

    const publishPlanEvent = (type: string, data: Record<string, unknown>): void => {
      publish(type, data);
    };

    const tools = await buildAgentTools(this.context, {
      sessionId,
      mcpEnabled: Boolean(options.mcpEnabled),
      agentMode: Boolean(options.agentMode),
      agentFiles: Boolean(options.agentFiles),
      emitEvent: publishPlanEvent,
    });

    agent.setTools(tools);

    const unsubscribe = agent.subscribe((event) => {
      handleAgentEvent(
        event,
        {
          runId,
          sessionId,
          publish,
          toolExecutionStarts,
          toolCallToMessageId,
          userMessageId,
          setAssistantId: (id) => {
            currentAssistantMessageId = id;
          },
          setLastAssistantId: (id) => {
            lastAssistantMessageId = id;
          },
          getAssistantId: () => currentAssistantMessageId,
          getLastAssistantId: () => lastAssistantMessageId,
          cleanMessage,
          getTurnIndex: () => turnIndex,
          setTurnIndex: (value) => {
            turnIndex = value;
          },
          markError: (message, status) => {
            runStatus = status;
            runError = message;
          },
        },
        {
          createMessageId: () => randomUUID(),
          mapToolCallsToMessage: (assistant, messageId, mapping) => {
            this.mapToolCallsToMessage(assistant, messageId, mapping);
          },
          persistAssistantMessage: (sid, mid, assistant, toolResults, rid, turnIndex) => {
            persistAssistantMessage(this.context, {
              sessionId: sid,
              messageId: mid,
              assistant,
              toolResults,
              runId: rid,
              ...(typeof turnIndex === "number" ? { turnIndex } : {}),
            });
          },
          addToolExecution: (rid, toolCallId, toolName, toolExecutionOptions) => {
            this.context.stores.chatStore.addToolExecution(rid, toolCallId, toolName, toolExecutionOptions);
          },
          parseToolServer: (toolName) => this.parseToolServer(toolName),
          extractToolResultText: (result) => extractToolResultText(result),
        },
      );
    });

    publish("run_start", {
      user_message_id: userMessageId,
      model: modelId,
    });

    const runPromise = agent
      .prompt(content)
      .catch((error) => {
        runStatus = abort.signal.aborted ? "aborted" : "error";
        runError = error instanceof Error ? error.message : String(error);
      })
      .finally(() => {
        unsubscribe();
        this.activeRuns.delete(runId);
        this.context.stores.chatStore.updateRun(runId, {
          status: runStatus,
          finishedAt: new Date().toISOString(),
        });
        publish("run_end", {
          status: runStatus,
          error: runError,
        });
        queue.close();
      });

    return {
      runId,
      stream: createSseStream(queue, abort, runPromise),
    };
  }

  /**
   * Start a deterministic mock run (no external inference dependencies).
   * Enabled via VLLM_STUDIO_MOCK_INFERENCE=true/1.
   * @param session - Chat session record.
   * @param options - Run options.
   * @param content - Trimmed user content.
   * @returns Run stream.
   */
  private async startMockRun(
    session: Record<string, unknown>,
    options: ChatRunOptions,
    content: string,
  ): Promise<ChatRunStream> {
    const sessionId = options.sessionId;
    const modelId = await this.resolveModelId(session, options.model);
    const systemPrompt = buildSystemPrompt(session, options.systemPrompt, options.agentMode ?? false);

    const runId = randomUUID();
    const userMessageId = options.messageId ?? randomUUID();

    this.context.stores.chatStore.addMessage(
      sessionId,
      userMessageId,
      "user",
      content,
      modelId,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      [{ type: "text", text: content }],
      { runId },
    );

    const runOptions = {
      userMessageId,
      model: modelId,
      status: "running",
      ...(systemPrompt ? { system: systemPrompt } : {}),
      ...(options.mcpEnabled || options.agentMode || options.agentFiles ? { toolsetId: "agent" } : {}),
    };

    this.context.stores.chatStore.createRun(runId, sessionId, runOptions);

    const queue = new AsyncQueue<string>(200);
    const abort = new AbortController();
    const { publish } = createRunPublisher(this.context, { runId, sessionId, queue });

    const runPromise = (async (): Promise<void> => {
      publish("run_start", { user_message_id: userMessageId, model: modelId });
      publish("turn_start", { turn_index: 0 });

      const assistantMessageId = randomUUID();
      const assistant: AssistantMessage = {
        role: "assistant",
        api: "mock",
        provider: "mock",
        model: modelId,
        stopReason: "stop",
        usage: {
          input: 0,
          output: 0,
          cacheRead: 0,
          cacheWrite: 0,
          totalTokens: 0,
          cost: {
            input: 0,
            output: 0,
            cacheRead: 0,
            cacheWrite: 0,
            total: 0,
          },
        },
        content: [
          {
            type: "text",
            text:
              `Mock response (no inference):\\n\\n` +
              `You said: ${content}\\n\\n` +
              `Model: ${modelId}` +
              (systemPrompt ? `\\nSystem prompt bytes: ${Buffer.byteLength(systemPrompt, "utf8")}` : ""),
          },
        ],
        timestamp: Date.now(),
      };

      publish("message_start", { message_id: assistantMessageId, message: assistant, turn_index: 0 });
      publish("message_end", { message_id: assistantMessageId, message: assistant, turn_index: 0 });

      persistAssistantMessage(this.context, {
        sessionId,
        messageId: assistantMessageId,
        assistant,
        toolResults: [],
        runId,
        turnIndex: 0,
      });
      publish("turn_end", { message_id: assistantMessageId, message: assistant, toolResults: [], turn_index: 0 });

      this.context.stores.chatStore.updateRun(runId, {
        status: "completed",
        finishedAt: new Date().toISOString(),
      });
      publish("run_end", { status: "completed", error: null });
    })()
      .catch((error) => {
        const message = error instanceof Error ? error.message : String(error);
        this.context.stores.chatStore.updateRun(runId, {
          status: "error",
          finishedAt: new Date().toISOString(),
        });
        publish("run_end", { status: "error", error: message });
      })
      .finally(() => {
        queue.close();
      });

    return {
      runId,
      stream: createSseStream(queue, abort, runPromise),
    };
  }

  /**
   * Determine whether mock inference is enabled.
   * @returns True when mock inference mode is enabled.
   */
	  private isMockInferenceEnabled(): boolean {
	    const raw = process.env["VLLM_STUDIO_MOCK_INFERENCE"];
	    if (!raw) return false;
	    const normalized = String(raw).trim().toLowerCase();
	    return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
	  }

  /**
   * Map tool call ids to assistant message ids.
   * @param assistant - Assistant message with tool calls.
   * @param messageId - Assistant message id.
   * @param toolCallToMessageId - Mapping of tool call to message id.
   */
	  private mapToolCallsToMessage(
	    assistant: AssistantMessage,
	    messageId: string | null,
	    toolCallToMessageId: Map<string, string>,
	  ): void {
	    if (!messageId) return;
	    for (const block of assistant.content) {
	      if (block.type === "toolCall") {
	        toolCallToMessageId.set(block.id, messageId);
	      }
	    }
	  }

  /**
   * Parse the MCP server prefix from a tool name.
   * @param toolName - Tool name (server__tool).
   * @returns Server id or null.
   */
  private parseToolServer(toolName: string): string | null {
    const parts = toolName.split("__");
    if (parts.length > 1) return parts[0] ?? null;
    return null;
  }

  /**
   * Resolve model id from override, session, or running process.
   * @param session - Session record.
   * @param override - Optional model override.
   * @returns Model identifier.
   */
  private async resolveModelId(
    session: Record<string, unknown>,
    override?: string,
  ): Promise<string> {
    if (override) return override;
    const sessionModel = typeof session["model"] === "string" ? session["model"] : undefined;
    if (sessionModel) return sessionModel;
    const current = await this.context.processManager.findInferenceProcess(this.context.config.inference_port);
    if (current?.served_model_name) return current.served_model_name;
    if (current?.model_path) {
      const parts = current.model_path.split("/");
      const tail = parts[parts.length - 1];
      if (tail) return tail;
    }
    return "default";
  }

  /**
   * Resolve API key for model calls.
   * @returns API key string.
   */
  private resolveApiKey(): string {
    return this.context.config.api_key ?? process.env["OPENAI_API_KEY"] ?? "none";
  }

  // currentRunId/currentSessionId intentionally omitted; run + session are tracked per stream.
}
