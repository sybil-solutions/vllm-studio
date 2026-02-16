// CRITICAL
import { describe, it, expect } from "bun:test";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { ChatStore } from "./store";

describe("ChatStore schema", () => {
  it("persists tool_call_id and name", () => {
    const root = mkdtempSync(join(tmpdir(), "vllm-studio-chat-store-"));
    const dbPath = join(root, "chats.db");
    const store = new ChatStore(dbPath);

    const sessionId = randomUUID();
    store.createSession(sessionId, "Test Session");

    store.addMessage(
      sessionId,
      "msg-1",
      "tool",
      "ok",
      "test-model",
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      "call-1",
      "server__tool"
    );

    const session = store.getSession(sessionId);
    const messages = (session?.["messages"] ?? []) as Array<Record<string, unknown>>;
    expect(messages.length).toBe(1);
    expect(messages[0]?.["tool_call_id"]).toBe("call-1");
    expect(messages[0]?.["name"]).toBe("server__tool");
  });

  it("creates run tables and accepts inserts", () => {
    const root = mkdtempSync(join(tmpdir(), "vllm-studio-chat-run-"));
    const dbPath = join(root, "chats.db");
    const store = new ChatStore(dbPath);

    const sessionId = randomUUID();
    store.createSession(sessionId, "Run Session");

    const runId = randomUUID();
    const run = store.createRun(runId, sessionId, { model: "test-model" });
    expect(run["id"]).toBe(runId);
    expect(run["session_id"]).toBe(sessionId);

    const event = store.addRunEvent(runId, 1, "run_start", { session_id: sessionId });
    expect(event["type"]).toBe("run_start");
    expect((event["data"] as Record<string, unknown>)["session_id"]).toBe(sessionId);

    const tool = store.addToolExecution(runId, "call-1", "server__tool", {
      arguments: { q: "hello" },
      resultText: "ok",
    });
    expect(tool["tool_call_id"]).toBe("call-1");
    expect(tool["tool_name"]).toBe("server__tool");
  });
});
