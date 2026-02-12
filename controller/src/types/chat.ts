// CRITICAL

/**
 * Chat/session DTOs.
 *
 * These types are intentionally shaped to match the controller's existing JSON payloads
 * (including snake_case keys coming from SQLite). They extend `Record<string, unknown>`
 * so legacy call sites that still treat these as generic records remain compatible,
 * while allowing us to incrementally tighten type-safety.
 */

export type ChatSessionListItem = Record<string, unknown> & {
  id: string;
  title: string;
  model: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ChatSessionSummary = Record<string, unknown> & {
  id: string;
  title: string;
  model: string | null;
  parent_id: string | null;
  agent_state: unknown | null;
  created_at: string;
  updated_at: string;
};

export type ChatMessage = Record<string, unknown> & {
  id: string;
  role: string;
  content: string | null;
  model: string | null;
  tool_calls: unknown[] | null;
  tool_call_id: string | null;
  name: string | null;
  parts: unknown[] | null;
  metadata: unknown | null;
  request_prompt_tokens: number | null;
  request_tools_tokens: number | null;
  request_total_input_tokens: number | null;
  request_completion_tokens: number | null;
  created_at: string;
};

export type ChatSession = ChatSessionSummary & {
  messages: ChatMessage[];
};

export type ChatUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type ChatRun = Record<string, unknown> & {
  id: string;
  session_id: string;
  user_message_id: string | null;
  model: string | null;
  system: string | null;
  toolset_id: string | null;
  created_at: string;
  updated_at: string;
  finished_at: string | null;
  status: string;
};

export type ChatRunEvent = Record<string, unknown> & {
  id: string;
  run_id: string;
  seq: number;
  type: string;
  data: unknown | null;
  created_at: string;
};

export type ChatToolExecution = Record<string, unknown> & {
  id: string;
  run_id: string;
  tool_call_id: string;
  tool_name: string;
  tool_server: string | null;
  arguments_json: string;
  result_text: string | null;
  is_error: number;
  started_at: string | null;
  finished_at: string | null;
};

export type ChatAgentFileVersion = Record<string, unknown> & {
  version: number;
  content: string;
  created_at_ms: number;
};

export type ChatAgentFileVersionWrite = {
  version: number;
  created_at_ms: number;
};

