// CRITICAL
import type { Hono } from "hono";
import type { AppContext } from "../types/context";
import { badRequest, notFound } from "../core/errors";

const resolveHfToken = (ctx: { req: { header: (name: string) => string | undefined } }, body?: Record<string, unknown>): string | null => {
  const bodyToken = typeof body?.["hf_token"] === "string" ? String(body?.["hf_token"]) : null;
  const headerToken = ctx.req.header("x-hf-token") ?? ctx.req.header("x-huggingface-token") ?? null;
  const envToken =
    process.env["VLLM_STUDIO_HF_TOKEN"] ??
    process.env["HF_TOKEN"] ??
    process.env["HUGGINGFACE_TOKEN"] ??
    null;
  return bodyToken || headerToken || envToken;
};

/**
 * Register model download routes.
 * @param app - Hono application.
 * @param context - App context.
 */
export const registerDownloadsRoutes = (app: Hono, context: AppContext): void => {
  app.get("/studio/downloads", async (ctx) => {
    const downloads = context.downloadManager.list();
    return ctx.json({ downloads });
  });

  app.get("/studio/downloads/:downloadId", async (ctx) => {
    const id = ctx.req.param("downloadId");
    const download = context.downloadManager.get(id);
    if (!download) {
      throw notFound("Download not found");
    }
    return ctx.json({ download });
  });

  app.post("/studio/downloads", async (ctx) => {
    const body = await ctx.req.json().catch(() => ({}));
    if (body && typeof body !== "object") {
      throw badRequest("Invalid payload");
    }
    const modelId = typeof body?.model_id === "string" ? body.model_id : null;
    if (!modelId) {
      throw badRequest("model_id is required");
    }
    const download = await context.downloadManager.start({
      model_id: modelId,
      revision: typeof body?.revision === "string" ? body.revision : null,
      destination_dir: typeof body?.destination_dir === "string" ? body.destination_dir : null,
      allow_patterns: Array.isArray(body?.allow_patterns) ? body.allow_patterns.map(String) : null,
      ignore_patterns: Array.isArray(body?.ignore_patterns) ? body.ignore_patterns.map(String) : null,
      hf_token: resolveHfToken(ctx, body),
    });
    return ctx.json({ download });
  });

  app.post("/studio/downloads/:downloadId/pause", async (ctx) => {
    const id = ctx.req.param("downloadId");
    const download = context.downloadManager.pause(id);
    return ctx.json({ download });
  });

  app.post("/studio/downloads/:downloadId/resume", async (ctx) => {
    const body = await ctx.req.json().catch(() => ({}));
    const token = resolveHfToken(ctx, body);
    const id = ctx.req.param("downloadId");
    const download = context.downloadManager.resume(id, token);
    return ctx.json({ download });
  });

  app.post("/studio/downloads/:downloadId/cancel", async (ctx) => {
    const id = ctx.req.param("downloadId");
    const download = context.downloadManager.cancel(id);
    return ctx.json({ download });
  });
};
