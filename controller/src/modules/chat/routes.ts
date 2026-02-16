import type { Hono } from "hono";
import type { AppContext } from "../../types/context";
import { registerChatsRoutes } from "./chats-routes";
import { registerAgentFilesRoutes } from "./agent-files-routes";

/**
 * Register all chat module routes (sessions, agent files).
 * @param app - Hono app.
 * @param context - App context.
 */
export const registerAllChatRoutes = (app: Hono, context: AppContext): void => {
  registerChatsRoutes(app, context);
  registerAgentFilesRoutes(app, context);
};
