// CRITICAL
import type { Database } from "bun:sqlite";

/**
 * Ensures a column exists in a table, adding it if missing.
 * @param db - SQLite database.
 * @param table - Table name.
 * @param column - Column name.
 * @param type - SQLite type.
 */
function ensureColumn(db: Database, table: string, column: string, type: string): void {
  // `table` and `column` are internal constants; no user input reaches here.
  const columns = db.query(`PRAGMA table_info(${table})`).all() as Array<Record<string, unknown>>;
  const exists = columns.some((entry) => entry["name"] === column);
  if (!exists) {
    db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  }
}

/**
 * Initialize/update the chat store schema.
 * @param db - SQLite database.
 */
export function migrateChatStore(db: Database): void {
  db.run(`
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
  db.run(`
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
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_runs (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      user_message_id TEXT,
      model TEXT,
      system TEXT,
      toolset_id TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      finished_at TEXT,
      status TEXT NOT NULL DEFAULT 'running',
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
    )
  `);
  db.run(`
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
  db.run("CREATE INDEX IF NOT EXISTS idx_run_events_run ON chat_run_events(run_id)");
  db.run(`
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
  db.run("CREATE INDEX IF NOT EXISTS idx_tool_exec_run ON chat_tool_executions(run_id)");
  db.run("CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id)");

  // Agent file version history (for the agent workspace filesystem).
  // Stores snapshots of file contents on each write so the UI can show v1/v2/...
  db.run(`
    CREATE TABLE IF NOT EXISTS chat_agent_file_versions (
      id TEXT PRIMARY KEY,
      session_id TEXT NOT NULL,
      path TEXT NOT NULL,
      version INTEGER NOT NULL,
      content TEXT NOT NULL,
      bytes INTEGER,
      created_at_ms INTEGER NOT NULL,
      FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
      UNIQUE (session_id, path, version)
    )
  `);
  db.run("CREATE INDEX IF NOT EXISTS idx_agent_file_versions_session_path ON chat_agent_file_versions(session_id, path)");

  // Forward-compatible columns
  ensureColumn(db, "chat_sessions", "agent_state", "TEXT");
  ensureColumn(db, "chat_messages", "tool_call_id", "TEXT");
  ensureColumn(db, "chat_messages", "name", "TEXT");
  ensureColumn(db, "chat_messages", "parts", "TEXT");
  ensureColumn(db, "chat_messages", "metadata", "TEXT");
  ensureColumn(db, "chat_runs", "updated_at", "TEXT");
}
