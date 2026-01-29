// CRITICAL
import type { Hono } from "hono";
import type { AppContext } from "../types/context";
import { badRequest } from "../core/errors";
import { getVllmConfigHelp, getVllmRuntimeInfo, upgradeVllmRuntime } from "../services/vllm-runtime";

export const registerRuntimeRoutes = (app: Hono, _context: AppContext): void => {
  app.get("/runtime/vllm", async (ctx) => {
    const info = await getVllmRuntimeInfo();
    return ctx.json(info);
  });

  app.get("/runtime/vllm/config", async (ctx) => {
    const config = await getVllmConfigHelp();
    return ctx.json(config);
  });

  app.post("/runtime/vllm/upgrade", async (ctx) => {
    const body = await ctx.req.json().catch(() => ({}));
    if (body && typeof body !== "object") {
      throw badRequest("Invalid payload");
    }
    const preferBundled = body?.prefer_bundled !== false;
    const result = await upgradeVllmRuntime(preferBundled);
    return ctx.json(result);
  });
};
