// CRITICAL
import type { Hono } from "hono";
import { mkdirSync, promises as fs } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { AppContext } from "../types/context";
import { badRequest, notFound } from "../core/errors";

interface AgentFileEntry {
  name: string;
  type: "file" | "dir";
  size?: number;
  children?: AgentFileEntry[];
}

const ensureWorkspace = (context: AppContext, sessionId: string): string => {
  const root = resolve(context.config.data_dir, "agent-files", sessionId);
  mkdirSync(root, { recursive: true });
  return root;
};

const resolveSafePath = (root: string, rawPath: string): string => {
  const cleaned = rawPath.replace(/^\/+/, "");
  const resolved = resolve(root, cleaned);
  const rel = relative(root, resolved);
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) {
    throw badRequest("Invalid path");
  }
  return resolved;
};

const buildTree = async (path: string, recursive: boolean): Promise<AgentFileEntry[]> => {
  const entries = await fs.readdir(path, { withFileTypes: true });
  const mapped = await Promise.all(entries.map(async (entry) => {
    const entryPath = join(path, entry.name);
    if (entry.isDirectory()) {
      return {
        name: entry.name,
        type: "dir" as const,
        children: recursive ? await buildTree(entryPath, recursive) : [],
      };
    }
    const stat = await fs.stat(entryPath);
    return {
      name: entry.name,
      type: "file" as const,
      size: stat.size,
    };
  }));
  return mapped.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "dir" ? -1 : 1;
  });
};

export const registerAgentFilesRoutes = (app: Hono, context: AppContext): void => {
  app.get("/chats/:sessionId/files", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const root = ensureWorkspace(context, sessionId);
    const pathParam = ctx.req.query("path") ?? "";
    const recursive = ctx.req.query("recursive") !== "false";
    const target = pathParam ? resolveSafePath(root, pathParam) : root;
    const files = await buildTree(target, recursive);
    return ctx.json({ files, path: pathParam || undefined });
  });

  app.get("/chats/:sessionId/files/*", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const rawPath = ctx.req.param("*");
    if (!rawPath) throw badRequest("Path is required");
    const root = ensureWorkspace(context, sessionId);
    const target = resolveSafePath(root, rawPath);
    const stat = await fs.stat(target).catch(() => null);
    if (!stat) throw notFound("File not found");
    if (stat.isDirectory()) throw badRequest("Path is a directory");
    const content = await fs.readFile(target, "utf8");
    return ctx.json({ path: rawPath, content });
  });

  app.put("/chats/:sessionId/files/*", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const rawPath = ctx.req.param("*");
    if (!rawPath) throw badRequest("Path is required");
    const body = (await ctx.req.json()) as Record<string, unknown>;
    const content = typeof body["content"] === "string" ? body["content"] : "";
    const encoding = body["encoding"] === "base64" ? "base64" : "utf8";
    const root = ensureWorkspace(context, sessionId);
    const target = resolveSafePath(root, rawPath);
    await fs.mkdir(dirname(target), { recursive: true });
    const data = encoding === "base64" ? Buffer.from(content, "base64") : content;
    await fs.writeFile(target, data);
    return ctx.json({ success: true });
  });

  app.delete("/chats/:sessionId/files/*", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const rawPath = ctx.req.param("*");
    if (!rawPath) throw badRequest("Path is required");
    const root = ensureWorkspace(context, sessionId);
    const target = resolveSafePath(root, rawPath);
    await fs.rm(target, { recursive: true, force: true });
    return ctx.json({ success: true });
  });

  app.post("/chats/:sessionId/files/dir", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const body = (await ctx.req.json()) as Record<string, unknown>;
    const rawPath = typeof body["path"] === "string" ? body["path"] : "";
    if (!rawPath) throw badRequest("Path is required");
    const root = ensureWorkspace(context, sessionId);
    const target = resolveSafePath(root, rawPath);
    await fs.mkdir(target, { recursive: true });
    return ctx.json({ success: true });
  });

  app.post("/chats/:sessionId/files/move", async (ctx) => {
    const sessionId = ctx.req.param("sessionId");
    const body = (await ctx.req.json()) as Record<string, unknown>;
    const from = typeof body["from"] === "string" ? body["from"] : "";
    const to = typeof body["to"] === "string" ? body["to"] : "";
    if (!from || !to) throw badRequest("from and to are required");
    const root = ensureWorkspace(context, sessionId);
    const fromPath = resolveSafePath(root, from);
    const toPath = resolveSafePath(root, to);
    await fs.mkdir(dirname(toPath), { recursive: true });
    await fs.rename(fromPath, toPath);
    return ctx.json({ success: true });
  });
};
