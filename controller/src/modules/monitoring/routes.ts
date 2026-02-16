import type { Hono } from "hono";
import type { AppContext } from "../../types/context";
import { registerMonitoringRoutes } from "./metrics-routes";
import { registerLogsRoutes } from "./logs-routes";
import { registerUsageRoutes } from "./usage-routes";

/**
 * Register all monitoring module routes (metrics, logs, usage).
 * @param app - Hono app.
 * @param context - App context.
 */
export const registerAllMonitoringRoutes = (app: Hono, context: AppContext): void => {
  registerMonitoringRoutes(app, context);
  registerLogsRoutes(app, context);
  registerUsageRoutes(app, context);
};
