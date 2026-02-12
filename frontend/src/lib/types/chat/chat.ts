// CRITICAL
/**
 * Chat + tool calling types.
 */

import type { AgentState } from "./agent";

export type ChatMessageRole = "user" | "assistant";

// Tool calling types
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
  server?: string;
}

export interface StoredToolCall extends ToolCall {
  providerExecuted?: boolean;
  dynamic?: boolean;
  result?: { content?: string; isError?: boolean } | string | null;
}

export interface ToolResult {
  tool_call_id: string;
  content: string;
  name?: string;
  isError?: boolean;
}

export interface ChatMessageUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface ChatMessageMetadata {
  model?: string;
  usage?: ChatMessageUsage;
  internal?: boolean;
  [key: string]: unknown;
}

export type ChatMessagePart =
  | { type: "text"; text: string }
  | { type: "reasoning"; text: string }
  | {
      type: "dynamic-tool";
      toolCallId: string;
      toolName?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
      state?: string;
      providerExecuted?: boolean;
    }
  | {
      type: `tool-${string}`;
      toolCallId: string;
      toolName?: string;
      input?: unknown;
      output?: unknown;
      errorText?: string;
      state?: string;
      providerExecuted?: boolean;
    };

export interface StoredMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  model?: string;
  tool_calls?: StoredToolCall[];
  parts?: ChatMessagePart[];
  metadata?: ChatMessageMetadata;
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  request_prompt_tokens?: number | null;
  request_tools_tokens?: number | null;
  request_total_input_tokens?: number | null;
  request_completion_tokens?: number | null;
  estimated_cost_usd?: number | null;
}

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  parts: ChatMessagePart[];
  metadata?: ChatMessageMetadata;
  model?: string;
  tool_calls?: StoredToolCall[];
  content?: string;
  created_at?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  model?: string;
  parent_id?: string;
  agent_state?: AgentState | null;
  first_user_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages?: StoredMessage[];
}

export interface ChatCompactionResponse {
  session: ChatSessionDetail;
  summary: string;
}

export interface SessionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
  estimated_cost?: number | null;
}

