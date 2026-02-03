// CRITICAL
import { Database } from "bun:sqlite";
import { randomUUID } from "node:crypto";

/**
 * SQLite-backed chat session storage.
 */
export class ChatStore {
  private readonly db: Database;

  /**
   * Create a chat store.
   * @param dbPath - SQLite database path.
   */
  public constructor(dbPath: string) {
    this.db = new Database(dbPath);
    this.db.run("PRAGMA busy_timeout = 5000");
    this.migrate();
  }

  /**
   * Initialize schema.
   * @returns void
   */
  private migrate(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_sessions (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'New Chat',
        model TEXT,
        parent_id TEXT,
        agent_state TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        content TEXT,
        model TEXT,
        tool_calls TEXT,
        tool_call_id TEXT,
        name TEXT,
        parts TEXT,
        metadata TEXT,
        request_prompt_tokens INTEGER,
        request_tools_tokens INTEGER,
        request_total_input_tokens INTEGER,
        request_completion_tokens INTEGER,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_runs (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        user_message_id TEXT,
        model TEXT,
        system TEXT,
        toolset_id TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        finished_at TEXT,
        status TEXT NOT NULL DEFAULT 'running',
        FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
      )
    `);
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_run_events (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        type TEXT NOT NULL,
        data TEXT NOT NULL,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (run_id) REFERENCES chat_runs(id) ON DELETE CASCADE,
        UNIQUE (run_id, seq)
      )
    `);
    this.db.run("CREATE INDEX IF NOT EXISTS idx_run_events_run ON chat_run_events(run_id)");
    this.db.run(`
      CREATE TABLE IF NOT EXISTS chat_tool_executions (
        id TEXT PRIMARY KEY,
        run_id TEXT NOT NULL,
        tool_call_id TEXT NOT NULL,
        tool_name TEXT NOT NULL,
        tool_server TEXT,
        arguments_json TEXT NOT NULL,
        result_text TEXT,
        is_error INTEGER NOT NULL DEFAULT 0,
        started_at TEXT DEFAULT CURRENT_TIMESTAMP,
        finished_at TEXT,
        FOREIGN KEY (run_id) REFERENCES chat_runs(id) ON DELETE CASCADE,
        UNIQUE (run_id, tool_call_id)
      )
    `);
    this.db.run("CREATE INDEX IF NOT EXISTS idx_tool_exec_run ON chat_tool_executions(run_id)");
    this.db.run("CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id)");
    this.ensureColumn("chat_sessions", "agent_state", "TEXT");
    this.ensureColumn("chat_messages", "tool_call_id", "TEXT");
    this.ensureColumn("chat_messages", "name", "TEXT");
    this.ensureColumn("chat_messages", "parts", "TEXT");
    this.ensureColumn("chat_messages", "metadata", "TEXT");
  }

  /**
   * Ensures a column exists in a table, adding it if missing.
   * @param table - Table name.
   * @param column - Column name.
   * @param type - SQLite column type.
   */
  private ensureColumn(table: string, column: string, type: string): void {
    const columns = this.db.query(`PRAGMA table_info(${table})`).all() as Array<Record<string, unknown>>;
    const exists = columns.some((entry) => entry["name"] === column);
    if (!exists) {
      this.db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
    }
  }

  /**
   * List all chat sessions.
   * @returns List of sessions.
   */
  public listSessions(): Array<Record<string, unknown>> {
    const rows = this.db
      .query("SELECT id, title, model, parent_id, created_at, updated_at FROM chat_sessions ORDER BY updated_at DESC")
      .all() as Array<Record<string, unknown>>;
    return rows.map((row) => ({ ...row }));
  }

  /**
   * Get a session summary without messages.
   * @param sessionId - Session identifier.
   * @returns Session summary or null.
   */
  public getSessionSummary(sessionId: string): Record<string, unknown> | null {
    const session = this.db
      .query("SELECT id, title, model, parent_id, agent_state, created_at, updated_at FROM chat_sessions WHERE id = ?")
      .get(sessionId) as Record<string, unknown> | null;
    if (!session) {
      return null;
    }

    if (typeof session["agent_state"] === "string") {
      try {
        session["agent_state"] = JSON.parse(String(session["agent_state"]));
      } catch {
        session["agent_state"] = null;
      }
    }

    return { ...session };
  }

  /**
   * Get a session and its messages.
   * @param sessionId - Session identifier.
   * @returns Session object or null.
   */
  public getSession(sessionId: string): Record<string, unknown> | null {
    const session = this.db
      .query("SELECT id, title, model, parent_id, agent_state, created_at, updated_at FROM chat_sessions WHERE id = ?")
      .get(sessionId) as Record<string, unknown> | null;
    if (!session) {
      return null;
    }

    let agentState: unknown = session["agent_state"] ?? null;
    if (typeof agentState === "string") {
      try {
        agentState = JSON.parse(agentState);
      } catch {
        agentState = null;
      }
    }

    const messages = this.db
      .query(`SELECT id, role, content, model, tool_calls, tool_call_id, name, parts, metadata,
              request_prompt_tokens, request_tools_tokens, request_total_input_tokens, request_completion_tokens,
              created_at
              FROM chat_messages WHERE session_id = ? ORDER BY created_at, rowid`)
      .all(sessionId) as Array<Record<string, unknown>>;

    const hydrated = messages.map((message) => {
      const next: Record<string, unknown> = { ...message };
      if (typeof next["tool_calls"] === "string") {
        try {
          next["tool_calls"] = JSON.parse(String(next["tool_calls"]));
        } catch {
          next["tool_calls"] = null;
        }
      }
      if (typeof next["parts"] === "string") {
        try {
          next["parts"] = JSON.parse(String(next["parts"]));
        } catch {
          next["parts"] = null;
        }
      }
      if (typeof next["metadata"] === "string") {
        try {
          next["metadata"] = JSON.parse(String(next["metadata"]));
        } catch {
          next["metadata"] = null;
        }
      }
      return next;
    });

    return { ...session, agent_state: agentState, messages: hydrated };
  }

  /**
   * Create a new chat session.
   * @param sessionId - Session identifier.
   * @param title - Session title.
   * @param model - Model name.
   * @param parentId - Parent session id.
   * @param agentState
   * @returns Created session.
   */
  public createSession(
    sessionId: string,
    title = "New Chat",
    model?: string,
    parentId?: string,
    agentState?: unknown,
  ): Record<string, unknown> {
    const agentStateJson = agentState !== undefined && agentState !== null
      ? JSON.stringify(agentState)
      : null;
    this.db
      .query("INSERT INTO chat_sessions (id, title, model, parent_id, agent_state) VALUES (?, ?, ?, ?, ?)")
      .run(sessionId, title, model ?? null, parentId ?? null, agentStateJson);
    const row = this.db
      .query("SELECT id, title, model, parent_id, agent_state, created_at, updated_at FROM chat_sessions WHERE id = ?")
      .get(sessionId) as Record<string, unknown>;
    if (typeof row["agent_state"] === "string") {
      try {
        row["agent_state"] = JSON.parse(String(row["agent_state"]));
      } catch {
        row["agent_state"] = null;
      }
    }
    return { ...row };
  }

  /**
   * Update session title or model.
   * @param sessionId - Session identifier.
   * @param title - New title.
   * @param model - New model.
   * @param agentState
   * @returns True if updated.
   */
  public updateSession(
    sessionId: string,
    title?: string,
    model?: string,
    agentState?: unknown,
  ): boolean {
    const updates: string[] = [];
    const params: Array<string | null> = [];
    if (title !== undefined) {
      updates.push("title = ?");
      params.push(title);
    }
    if (model !== undefined) {
      updates.push("model = ?");
      params.push(model);
    }
    if (agentState !== undefined) {
      updates.push("agent_state = ?");
      params.push(agentState === null ? null : JSON.stringify(agentState));
    }
    if (updates.length === 0) {
      return true;
    }
    updates.push("updated_at = CURRENT_TIMESTAMP");
    params.push(sessionId);
    const result = this.db
      .query(`UPDATE chat_sessions SET ${updates.join(", ")} WHERE id = ?`)
      .run(...params);
    return result.changes > 0;
  }

  /**
   * Delete a chat session and its messages.
   * @param sessionId - Session identifier.
   * @returns True if deleted.
   */
  public deleteSession(sessionId: string): boolean {
    this.db.query("DELETE FROM chat_messages WHERE session_id = ?").run(sessionId);
    const result = this.db.query("DELETE FROM chat_sessions WHERE id = ?").run(sessionId);
    return result.changes > 0;
  }

  /**
   * Add a message to a session.
   * @param sessionId - Session identifier.
   * @param messageId - Message identifier.
   * @param role - Message role.
   * @param content - Message content.
   * @param model - Model name.
   * @param toolCalls - Tool call array.
   * @param promptTokens - Prompt token count.
   * @param toolsTokens - Tools token count.
   * @param totalInputTokens - Total input tokens.
   * @param completionTokens - Completion tokens.
   * @param parts - Structured message parts.
   * @param metadata - Message metadata.
   * @param toolCallId - Tool call identifier.
   * @param name - Tool name (for tool messages).
   * @returns Stored message.
   */
  public addMessage(
    sessionId: string,
    messageId: string,
    role: string,
    content?: string,
    model?: string,
    toolCalls?: unknown[],
    promptTokens?: number,
    toolsTokens?: number,
    totalInputTokens?: number,
    completionTokens?: number,
    parts?: unknown[],
    metadata?: unknown,
    toolCallId?: string,
    name?: string,
  ): Record<string, unknown> {
    const toolCallsJson = toolCalls ? JSON.stringify(toolCalls) : null;
    const partsJson = parts ? JSON.stringify(parts) : null;
    const metadataJson = metadata !== undefined && metadata !== null ? JSON.stringify(metadata) : null;
    this.db.query(
      `INSERT INTO chat_messages
      (id, session_id, role, content, model, tool_calls, tool_call_id, name, parts, metadata,
       request_prompt_tokens, request_tools_tokens, request_total_input_tokens, request_completion_tokens)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        role = excluded.role,
        model = excluded.model,
        content = excluded.content,
        tool_calls = excluded.tool_calls,
        tool_call_id = excluded.tool_call_id,
        name = excluded.name,
        parts = excluded.parts,
        metadata = excluded.metadata,
        request_prompt_tokens = excluded.request_prompt_tokens,
        request_tools_tokens = excluded.request_tools_tokens,
        request_total_input_tokens = excluded.request_total_input_tokens,
        request_completion_tokens = excluded.request_completion_tokens`
    ).run(
      messageId,
      sessionId,
      role,
      content ?? null,
      model ?? null,
      toolCallsJson,
      toolCallId ?? null,
      name ?? null,
      partsJson,
      metadataJson,
      promptTokens ?? null,
      toolsTokens ?? null,
      totalInputTokens ?? null,
      completionTokens ?? null,
    );
    this.db.query("UPDATE chat_sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").run(sessionId);
    const row = this.db
      .query(
        `SELECT id, role, content, model, tool_calls, tool_call_id, name, parts, metadata,
         request_prompt_tokens, request_tools_tokens, request_total_input_tokens, request_completion_tokens, created_at
         FROM chat_messages WHERE id = ?`,
      )
      .get(messageId) as Record<string, unknown>;
    if (typeof row["tool_calls"] === "string") {
      try {
        row["tool_calls"] = JSON.parse(String(row["tool_calls"]));
      } catch {
        row["tool_calls"] = null;
      }
    }
    if (typeof row["parts"] === "string") {
      try {
        row["parts"] = JSON.parse(String(row["parts"]));
      } catch {
        row["parts"] = null;
      }
    }
    if (typeof row["metadata"] === "string") {
      try {
        row["metadata"] = JSON.parse(String(row["metadata"]));
      } catch {
        row["metadata"] = null;
      }
    }
    return row;
  }

  /**
   * Get usage totals for a session.
   * @param sessionId - Session identifier.
   * @returns Usage stats.
   */
  public getUsage(sessionId: string): Record<string, number> {
    const rows = this.db
      .query(
        "SELECT request_prompt_tokens, request_tools_tokens, request_total_input_tokens, request_completion_tokens FROM chat_messages WHERE session_id = ?",
      )
      .all(sessionId) as Array<Record<string, unknown>>;

    let prompt = 0;
    let completion = 0;
    for (const row of rows) {
      const totalInput = Number(row["request_total_input_tokens"] ?? 0);
      const promptTokens = Number(row["request_prompt_tokens"] ?? 0);
      const completionTokens = Number(row["request_completion_tokens"] ?? 0);
      prompt += totalInput > 0 ? totalInput : promptTokens;
      completion += completionTokens;
    }
    return { prompt_tokens: prompt, completion_tokens: completion, total_tokens: prompt + completion };
  }

  /**
   * Fork an existing session.
   * @param sessionId - Original session id.
   * @param newId - New session id.
   * @param messageId - Optional message id to stop copying.
   * @param model - New model.
   * @param title - New title.
   * @returns Forked session or null.
   */
  public forkSession(
    sessionId: string,
    newId: string,
    messageId?: string,
    model?: string,
    title?: string,
  ): Record<string, unknown> | null {
    const toNullableString = (value: unknown): string | null => {
      if (value === null || value === undefined) {
        return null;
      }
      return String(value);
    };

    const toNullableNumber = (value: unknown): number | null => {
      if (value === null || value === undefined) {
        return null;
      }
      const parsed = Number(value);
      return Number.isNaN(parsed) ? null : parsed;
    };

    const original = this.getSession(sessionId);
    if (!original) {
      return null;
    }
    const newTitle = title ?? `${String(original["title"])} (fork)`;
    const newModel = model ?? (original["model"] ? String(original["model"]) : undefined);
    const agentState = original["agent_state"] ?? null;
    const agentStateJson = agentState !== null ? JSON.stringify(agentState) : null;

    this.db.query("INSERT INTO chat_sessions (id, title, model, parent_id, agent_state) VALUES (?, ?, ?, ?, ?)")
      .run(newId, newTitle, newModel ?? null, sessionId, agentStateJson);

    const messages = (original["messages"] ?? []) as Array<Record<string, unknown>>;
    for (const message of messages) {
      const toolCallsJson = message["tool_calls"] ? JSON.stringify(message["tool_calls"]) : null;
      const partsJson = message["parts"] ? JSON.stringify(message["parts"]) : null;
      const metadataJson = message["metadata"] ? JSON.stringify(message["metadata"]) : null;
      const newMessageId = `${newId}_${String(message["id"])}`;
      const role = String(message["role"] ?? "");
      const content = toNullableString(message["content"]);
      const messageModel = toNullableString(message["model"]);
      const toolCallId = toNullableString(message["tool_call_id"]);
      const toolName = toNullableString(message["name"]);
      const promptTokens = toNullableNumber(message["request_prompt_tokens"]);
      const toolTokens = toNullableNumber(message["request_tools_tokens"]);
      const totalTokens = toNullableNumber(message["request_total_input_tokens"]);
      const completionTokens = toNullableNumber(message["request_completion_tokens"]);
      this.db.query(
        `INSERT INTO chat_messages
        (id, session_id, role, content, model, tool_calls, tool_call_id, name, parts, metadata,
         request_prompt_tokens, request_tools_tokens, request_total_input_tokens, request_completion_tokens)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        newMessageId,
        newId,
        role,
        content,
        messageModel,
        toolCallsJson,
        toolCallId,
        toolName,
        partsJson,
        metadataJson,
        promptTokens,
        toolTokens,
        totalTokens,
        completionTokens,
      );
      if (messageId && message["id"] === messageId) {
        break;
      }
    }

    const row = this.db
      .query("SELECT id, title, model, parent_id, agent_state, created_at, updated_at FROM chat_sessions WHERE id = ?")
      .get(newId) as Record<string, unknown>;
    if (typeof row["agent_state"] === "string") {
      try {
        row["agent_state"] = JSON.parse(String(row["agent_state"]));
      } catch {
        row["agent_state"] = null;
      }
    }
    return { ...row };
  }

  /**
   * Create a run record.
   * @param runId - Run identifier.
   * @param sessionId - Session identifier.
   * @param options - Optional run fields.
   * @param options.userMessageId - User message id.
   * @param options.model - Model name.
   * @param options.system - System prompt.
   * @param options.toolsetId - Toolset identifier.
   * @param options.status - Run status.
   * @returns Run record.
   */
  public createRun(
    runId: string,
    sessionId: string,
    options: {
      userMessageId?: string;
      model?: string;
      system?: string;
      toolsetId?: string;
      status?: string;
    } = {},
  ): Record<string, unknown> {
    this.db.query(
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
    return this.db
      .query(
        `SELECT id, session_id, user_message_id, model, system, toolset_id, created_at, finished_at, status
         FROM chat_runs WHERE id = ?`,
      )
      .get(runId) as Record<string, unknown>;
  }

  /**
   * Add a run event.
   * @param runId - Run identifier.
   * @param seq - Sequence number.
   * @param type - Event type.
   * @param data - Event payload.
   * @param eventId - Optional event id override.
   * @returns Stored event record.
   */
  public addRunEvent(
    runId: string,
    seq: number,
    type: string,
    data: Record<string, unknown>,
    eventId: string = randomUUID(),
  ): Record<string, unknown> {
    const dataJson = JSON.stringify(data);
    this.db.query(
      `INSERT INTO chat_run_events (id, run_id, seq, type, data)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(eventId, runId, seq, type, dataJson);
    const row = this.db
      .query("SELECT id, run_id, seq, type, data, created_at FROM chat_run_events WHERE id = ?")
      .get(eventId) as Record<string, unknown>;
    if (typeof row["data"] === "string") {
      try {
        row["data"] = JSON.parse(String(row["data"]));
      } catch {
        row["data"] = null;
      }
    }
    return row;
  }

  /**
   * Add a tool execution record.
   * @param runId - Run identifier.
   * @param toolCallId - Tool call id.
   * @param toolName - Tool name (canonical server__tool).
   * @param options - Optional fields.
   * @param options.toolServer - MCP server id.
   * @param options.arguments - Tool arguments payload.
   * @param options.resultText - Tool result text.
   * @param options.isError - Whether the tool errored.
   * @param options.startedAt - Execution start timestamp.
   * @param options.finishedAt - Execution finish timestamp.
   * @param options.id - Override record id.
   * @returns Stored tool execution record.
   */
  public addToolExecution(
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
  ): Record<string, unknown> {
    const argumentsJson = typeof options.arguments === "string"
      ? options.arguments
      : JSON.stringify(options.arguments ?? {});
    const id = options.id ?? randomUUID();
    this.db.query(
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
    return this.db
      .query(
        `SELECT id, run_id, tool_call_id, tool_name, tool_server, arguments_json, result_text, is_error,
         started_at, finished_at FROM chat_tool_executions WHERE id = ?`,
      )
      .get(id) as Record<string, unknown>;
  }

  /**
   * Update a run record.
   * @param runId - Run identifier.
   * @param updates - Fields to update.
   * @param updates.status - Run status.
   * @param updates.finishedAt - Finish timestamp.
   * @returns True if updated.
   */
  public updateRun(
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

    if (assignments.length === 0) {
      return false;
    }

    const statement = `UPDATE chat_runs SET ${assignments.join(", ")} WHERE id = ?`;
    params.push(runId);
    const result = this.db.query(statement).run(...params);
    return result.changes > 0;
  }
}
