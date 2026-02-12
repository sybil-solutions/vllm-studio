// CRITICAL
import type { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";
import { parseJsonOrNull } from "./chat-store-hydration";
import type { ChatRun, ChatRunEvent, ChatToolExecution } from "../types/chat";

/**
 * Create a run record.
 * @param db - SQLite database.
 * @param runId - Run identifier.
 * @param sessionId - Session identifier.
 * @param options - Optional run fields.
 * @param options.userMessageId - User message id.
 * @param options.model - Model name.
 * @param options.system - System prompt.
 * @param options.toolsetId - Toolset identifier.
 * @param options.status - Run status.
 * @returns Run row.
 */
export function createRun(
  db: Database,
  runId: string,
  sessionId: string,
  options: {
    userMessageId?: string;
    model?: string;
    system?: string;
    toolsetId?: string;
    status?: string;
  } = {},
): ChatRun {
  db.query(
    `INSERT INTO chat_runs
    (id, session_id, user_message_id, model, system, toolset_id, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    runId,
    sessionId,
    options.userMessageId ?? null,
    options.model ?? null,
    options.system ?? null,
    options.toolsetId ?? null,
    options.status ?? "running",
  );
  return db
    .query(
      `SELECT id, session_id, user_message_id, model, system, toolset_id, created_at, updated_at, finished_at, status
       FROM chat_runs WHERE id = ?`,
    )
    .get(runId) as ChatRun;
}

/**
 * Store a run event record.
 * @param db - SQLite database.
 * @param runId - Run identifier.
 * @param seq - Sequence number.
 * @param type - Event type.
 * @param data - Event payload.
 * @param eventId - Optional event id override.
 * @returns Event row.
 */
export function addRunEvent(
  db: Database,
  runId: string,
  seq: number,
  type: string,
  data: Record<string, unknown>,
  eventId: string = randomUUID(),
): ChatRunEvent {
  const dataJson = JSON.stringify(data);
  db.query(
    `INSERT INTO chat_run_events (id, run_id, seq, type, data)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(eventId, runId, seq, type, dataJson);
  const row = db
    .query("SELECT id, run_id, seq, type, data, created_at FROM chat_run_events WHERE id = ?")
    .get(eventId) as Record<string, unknown>;
  if (typeof row["data"] === "string") {
    row["data"] = parseJsonOrNull(row["data"]);
  }
  return row as ChatRunEvent;
}

/**
 * Store a tool execution record.
 * @param db - SQLite database.
 * @param runId - Run identifier.
 * @param toolCallId - Tool call identifier.
 * @param toolName - Tool name (canonical server__tool).
 * @param options - Optional fields.
 * @param options.toolServer - MCP server id.
 * @param options.arguments - Tool arguments payload.
 * @param options.resultText - Tool result text.
 * @param options.isError - Whether the tool errored.
 * @param options.startedAt - Execution start timestamp.
 * @param options.finishedAt - Execution finish timestamp.
 * @param options.id - Override record id.
 * @returns Tool execution row.
 */
export function addToolExecution(
  db: Database,
  runId: string,
  toolCallId: string,
  toolName: string,
  options: {
    toolServer?: string;
    arguments?: Record<string, unknown> | string;
    resultText?: string | null;
    isError?: boolean;
    startedAt?: string;
    finishedAt?: string;
    id?: string;
  } = {},
): ChatToolExecution {
  const argumentsJson =
    typeof options.arguments === "string" ? options.arguments : JSON.stringify(options.arguments ?? {});
  const id = options.id ?? randomUUID();
  db.query(
    `INSERT INTO chat_tool_executions
    (id, run_id, tool_call_id, tool_name, tool_server, arguments_json, result_text, is_error, started_at, finished_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    runId,
    toolCallId,
    toolName,
    options.toolServer ?? null,
    argumentsJson,
    options.resultText ?? null,
    options.isError ? 1 : 0,
    options.startedAt ?? null,
    options.finishedAt ?? null,
  );
  return db
    .query(
      `SELECT id, run_id, tool_call_id, tool_name, tool_server, arguments_json, result_text, is_error,
       started_at, finished_at FROM chat_tool_executions WHERE id = ?`,
    )
    .get(id) as ChatToolExecution;
}

/**
 * Update a run record.
 * @param db - SQLite database.
 * @param runId - Run identifier.
 * @param updates - Fields to update.
 * @param updates.status - Run status.
 * @param updates.finishedAt - Finish timestamp.
 * @returns True if updated.
 */
export function updateRun(
  db: Database,
  runId: string,
  updates: {
    status?: string;
    finishedAt?: string | null;
  },
): boolean {
  const assignments: string[] = [];
  const params: Array<string | null> = [];

  if (updates.status !== undefined) {
    assignments.push("status = ?");
    params.push(updates.status ?? null);
  }

  if (updates.finishedAt !== undefined) {
    assignments.push("finished_at = ?");
    params.push(updates.finishedAt ?? null);
  }

  if (assignments.length === 0) return false;

  assignments.push("updated_at = CURRENT_TIMESTAMP");
  const statement = `UPDATE chat_runs SET ${assignments.join(", ")} WHERE id = ?`;
  params.push(runId);
  const result = db.query(statement).run(...params);
  return result.changes > 0;
}
