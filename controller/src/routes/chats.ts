// CRITICAL
import type { Hono } from "hono";
import { randomUUID } from "node:crypto";
import type { AppContext } from "../types/context";
import { notFound } from "../core/errors";
import { compactChatSession } from "../services/chat-compaction";

/**
 * Generate a simple title from the first few words of a message
 */
function generateTitleFromMessage(content: string): string {
  if (!content || !content.trim()) {
    return "New Chat";
  }

  const cleaned = content
    .replace(/\n/g, " ")
    .replace(/[^\w\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = cleaned.split(" ").filter((w) => w.length > 0);
  const titleWords = words.slice(0, 5);

  if (titleWords.length === 0) {
    return "New Chat";
  }

  const title = titleWords
    .map((w, i) => (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

  return title.length > 50 ? title.slice(0, 47) + "..." : title;
}

/**
 * Register chat session routes.
 * @param app - Hono app.
 * @param context - App context.
 */
export const registerChatsRoutes = (app: Hono, context: AppContext): void => {
  app.get("/chats", async (ctx) => {
    return ctx.json(context.stores.chatStore.listSessions());
  });

  app.get("/chats/:sessionId", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const session = context.stores.chatStore.getSession(sessionId);
    if (!session) {
      throw notFound("Session not found");
    }
    return ctx.json({ session });
  });

  app.post("/chats/:sessionId/compact", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    let body: Record<string, unknown> = {};
    try {
      body = (await ctx.req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const model = typeof body["model"] === "string" ? body["model"] : undefined;
    const systemPrompt = typeof body["system"] === "string" ? body["system"] : undefined;
    const title = typeof body["title"] === "string" ? body["title"] : undefined;
    const preserveFirst = body["preserve_first"] !== false;
    const preserveLast = body["preserve_last"] !== false;

    const result = await compactChatSession(context, sessionId, {
      ...(model ? { model } : {}),
      ...(systemPrompt ? { systemPrompt } : {}),
      ...(title ? { title } : {}),
      preserveFirst,
      preserveLast,
    });
    return ctx.json(result);
  });

  app.post("/chats", async (ctx) => {
    const body = (await ctx.req.json()) as Record<string, unknown>;
    const sessionId = randomUUID();
    const title = typeof body["title"] === "string" ? body["title"] : "New Chat";
    const model = typeof body["model"] === "string" ? body["model"] : undefined;
    const agentState = body["agent_state"];
    const session = context.stores.chatStore.createSession(sessionId, title, model, undefined, agentState);
    return ctx.json({ session });
  });

  app.put("/chats/:sessionId", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const body = (await ctx.req.json()) as Record<string, unknown>;
    const title = typeof body["title"] === "string" ? body["title"] : undefined;
    const model = typeof body["model"] === "string" ? body["model"] : undefined;
    const hasAgentState = Object.prototype.hasOwnProperty.call(body, "agent_state");
    const agentState = hasAgentState ? body["agent_state"] : undefined;
    const updated = context.stores.chatStore.updateSession(sessionId, title, model, agentState);
    if (!updated) {
      throw notFound("Session not found");
    }
    return ctx.json({ success: true });
  });

  app.delete("/chats/:sessionId", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const deleted = context.stores.chatStore.deleteSession(sessionId);
    if (!deleted) {
      throw notFound("Session not found");
    }
    return ctx.json({ success: true });
  });

  app.post("/chats/:sessionId/messages", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const body = (await ctx.req.json()) as Record<string, unknown>;
    const messageId = typeof body["id"] === "string" ? body["id"] : randomUUID();
    const role = typeof body["role"] === "string" ? body["role"] : "user";
    const content = typeof body["content"] === "string" ? body["content"] : undefined;
    const model = typeof body["model"] === "string" ? body["model"] : undefined;
    const toolCalls = Array.isArray(body["tool_calls"]) ? body["tool_calls"] : undefined;
    const parts = Array.isArray(body["parts"]) ? body["parts"] : undefined;
    const metadata = Object.prototype.hasOwnProperty.call(body, "metadata") ? body["metadata"] : undefined;
    const promptTokens = typeof body["request_prompt_tokens"] === "number" ? body["request_prompt_tokens"] : undefined;
    const toolsTokens = typeof body["request_tools_tokens"] === "number" ? body["request_tools_tokens"] : undefined;
    const totalInputTokens = typeof body["request_total_input_tokens"] === "number" ? body["request_total_input_tokens"] : undefined;
    const completionTokens = typeof body["request_completion_tokens"] === "number" ? body["request_completion_tokens"] : undefined;

    const message = context.stores.chatStore.addMessage(
      sessionId,
      messageId,
      role,
      content,
      model,
      toolCalls,
      promptTokens,
      toolsTokens,
      totalInputTokens,
      completionTokens,
      parts,
      metadata,
    );
    return ctx.json(message);
  });

  app.get("/chats/:sessionId/usage", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    return ctx.json(context.stores.chatStore.getUsage(sessionId));
  });

  app.post("/chats/retitle-all", async (ctx) => {
    const sessions = context.stores.chatStore.listSessions();
    let updated = 0;
    let skipped = 0;

    for (const session of sessions) {
      const sessionId = String(session["id"]);
      const fullSession = context.stores.chatStore.getSession(sessionId);
      if (!fullSession) {
        skipped++;
        continue;
      }

      const messages = (fullSession["messages"] ?? []) as Array<Record<string, unknown>>;
      const firstUserMessage = messages.find((m) => m["role"] === "user");

      if (!firstUserMessage || !firstUserMessage["content"]) {
        skipped++;
        continue;
      }

      const newTitle = generateTitleFromMessage(String(firstUserMessage["content"]));
      context.stores.chatStore.updateSession(sessionId, newTitle);
      updated++;
    }

    return ctx.json({ updated, skipped, total: sessions.length });
  });

  app.post("/chats/:sessionId/fork", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const body = (await ctx.req.json()) as Record<string, unknown>;
    const newId = randomUUID();
    const messageId = typeof body["message_id"] === "string" ? body["message_id"] : undefined;
    const model = typeof body["model"] === "string" ? body["model"] : undefined;
    const title = typeof body["title"] === "string" ? body["title"] : undefined;
    const session = context.stores.chatStore.forkSession(sessionId, newId, messageId, model, title);
    if (!session) {
      throw notFound("Session not found");
    }
    return ctx.json({ session });
  });
};
