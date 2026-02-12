// CRITICAL
import { posix } from "node:path";
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import type { TSchema } from "@sinclair/typebox";
import type { AppContext } from "../../types/context";
import { getAgentFs } from "../agent-fs-store";
import { Event } from "../event-manager";
import { createTextResult } from "./tool-registry-common";
import type { AgentToolRegistryOptions } from "./tool-registry";

interface AgentFileEntry {
  name: string;
  type: "file" | "dir";
  size?: number;
  children?: AgentFileEntry[];
}

type AgentFsApi = {
  readdirPlus: (
    path: string
  ) => Promise<Array<{ name: string; stats: { isDirectory: () => boolean; size: number } }>>;
  mkdir: (path: string) => Promise<void>;
  rename: (from: string, to: string) => Promise<void>;
  stat: (path: string) => Promise<{ isDirectory: () => boolean }>;
  readFile: (path: string, encoding: string) => Promise<string>;
  writeFile: (path: string, data: string | Buffer) => Promise<void>;
  rm: (path: string, options: { recursive: boolean; force: boolean }) => Promise<void>;
};

const normalizeAgentPath = (rawPath: string): string => {
  const cleaned = rawPath.replace(/^\/+/, "").trim();
  if (!cleaned) return "";
  const normalized = posix.normalize(cleaned);
  if (normalized === "." || normalized === "") return "";
  if (normalized.startsWith("..") || normalized.includes("/..")) {
    throw new Error("Invalid path");
  }
  return normalized.replace(/^\/+/, "");
};

const toFsPath = (relativePath: string): string => (relativePath ? `/${relativePath}` : "/");

const buildTree = async (
  fs: AgentFsApi,
  relativePath: string,
  recursive: boolean
): Promise<AgentFileEntry[]> => {
  const fsPath = toFsPath(relativePath);
  const entries = await fs.readdirPlus(fsPath);
  const mapped = await Promise.all(
    entries.map(async (entry) => {
      const isDirectory = entry.stats.isDirectory();
      const nextRelative = relativePath ? posix.join(relativePath, entry.name) : entry.name;
      if (isDirectory) {
        return {
          name: entry.name,
          type: "dir" as const,
          children: recursive ? await buildTree(fs, nextRelative, recursive) : [],
        };
      }
      return {
        name: entry.name,
        type: "file" as const,
        size: entry.stats.size,
      };
    })
  );
  return mapped.sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "dir" ? -1 : 1;
  });
};

const mkdirp = async (fs: AgentFsApi, relativePath: string): Promise<void> => {
  const segments = relativePath.split("/").filter(Boolean);
  let current = "";
  for (const segment of segments) {
    current = current ? `${current}/${segment}` : segment;
    try {
      await fs.mkdir(toFsPath(current));
    } catch (error) {
      const code = (error as { code?: string } | null)?.code;
      if (code !== "EEXIST") throw error;
    }
  }
};

/**
 * Build agent filesystem tools.
 * @param context - Application context.
 * @param options - Tool registry options.
 * @returns Agent tools.
 */
export const buildAgentFsTools = (
  context: AppContext,
  options: AgentToolRegistryOptions
): AgentTool[] => {
  const sessionId = options.sessionId;
  const emit = options.emitEvent;

  const withAgentFs = async <T>(operation: (fs: AgentFsApi) => Promise<T>): Promise<T> => {
    const agent = await getAgentFs(context, sessionId);
    return operation(agent.fs as AgentFsApi);
  };

  const listFiles: AgentTool = {
    name: "list_files",
    label: "list_files",
    description: "List files in the agent workspace.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string" },
        recursive: { type: "boolean" },
      },
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const normalized = normalizeAgentPath(typeof raw["path"] === "string" ? raw["path"] : "");
      const recursive = raw["recursive"] !== false;
      const files = await withAgentFs((fs) => buildTree(fs, normalized, recursive));
      emit?.("agent_files_listed", {
        session_id: sessionId,
        path: normalized || null,
        recursive,
        files,
      });
      await context.eventManager.publish(
        new Event("agent_files_listed", {
          session_id: sessionId,
          path: normalized || null,
          recursive,
          files,
        })
      );
      return createTextResult(JSON.stringify(files, null, 2), {
        files,
        path: normalized,
        recursive,
      });
    },
  };

  const readFile: AgentTool = {
    name: "read_file",
    label: "read_file",
    description: "Read a file from the agent workspace.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const path = normalizeAgentPath(typeof raw["path"] === "string" ? raw["path"] : "");
      if (!path) throw new Error("Path is required.");
      const content = await withAgentFs((fs) => fs.readFile(toFsPath(path), "utf8"));
      emit?.("agent_file_read", {
        session_id: sessionId,
        path,
        bytes: Buffer.byteLength(content, "utf8"),
      });
      await context.eventManager.publish(
        new Event("agent_file_read", {
          session_id: sessionId,
          path,
          bytes: Buffer.byteLength(content, "utf8"),
        })
      );
      return createTextResult(content, { path });
    },
  };

  const writeFile: AgentTool = {
    name: "write_file",
    label: "write_file",
    description:
      "Write or overwrite a file in the agent workspace. Parent directories are created automatically.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" }, content: { type: "string" } },
      required: ["path", "content"],
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const path = normalizeAgentPath(typeof raw["path"] === "string" ? raw["path"] : "");
      if (!path) throw new Error("Path is required.");
      const content = typeof raw["content"] === "string" ? raw["content"] : "";
      const parentDirectory = posix.dirname(path);
      if (parentDirectory && parentDirectory !== ".") {
        await withAgentFs((fs) => mkdirp(fs, parentDirectory));
      }
      await withAgentFs((fs) => fs.writeFile(toFsPath(path), content));
      context.stores.chatStore.addAgentFileVersion(
        sessionId,
        path,
        content,
        Buffer.byteLength(content, "utf8")
      );
      emit?.("agent_file_written", {
        session_id: sessionId,
        path,
        bytes: Buffer.byteLength(content, "utf8"),
      });
      await context.eventManager.publish(
        new Event("agent_file_written", {
          session_id: sessionId,
          path,
          bytes: Buffer.byteLength(content, "utf8"),
          encoding: "utf8",
        })
      );
      return createTextResult(`Wrote ${path}`, { path });
    },
  };

  const deleteFile: AgentTool = {
    name: "delete_file",
    label: "delete_file",
    description: "Delete a file from the agent workspace.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const path = normalizeAgentPath(typeof raw["path"] === "string" ? raw["path"] : "");
      if (!path) throw new Error("Path is required.");
      await withAgentFs((fs) => fs.rm(toFsPath(path), { recursive: true, force: true }));
      context.stores.chatStore.deleteAgentFileVersionsForPath(sessionId, path);
      emit?.("agent_file_deleted", { session_id: sessionId, path });
      await context.eventManager.publish(
        new Event("agent_file_deleted", { session_id: sessionId, path })
      );
      return createTextResult(`Deleted ${path}`, { path });
    },
  };

  const makeDirectory: AgentTool = {
    name: "make_directory",
    label: "make_directory",
    description: "Create a directory in the agent workspace.",
    parameters: {
      type: "object",
      properties: { path: { type: "string" } },
      required: ["path"],
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const path = normalizeAgentPath(typeof raw["path"] === "string" ? raw["path"] : "");
      if (!path) throw new Error("Path is required.");
      await withAgentFs((fs) => mkdirp(fs, path));
      emit?.("agent_directory_created", { session_id: sessionId, path });
      await context.eventManager.publish(
        new Event("agent_directory_created", { session_id: sessionId, path })
      );
      return createTextResult(`Created directory ${path}`, { path });
    },
  };

  const moveFile: AgentTool = {
    name: "move_file",
    label: "move_file",
    description: "Move or rename a file in the agent workspace.",
    parameters: {
      type: "object",
      properties: { from: { type: "string" }, to: { type: "string" } },
      required: ["from", "to"],
    } as unknown as TSchema,
    execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
      const raw = params as Record<string, unknown>;
      const from = normalizeAgentPath(typeof raw["from"] === "string" ? raw["from"] : "");
      const to = normalizeAgentPath(typeof raw["to"] === "string" ? raw["to"] : "");
      if (!from || !to) throw new Error("from and to are required.");
      await withAgentFs((fs) => fs.rename(toFsPath(from), toFsPath(to)));
      context.stores.chatStore.moveAgentFileVersions(sessionId, from, to);
      emit?.("agent_file_moved", { session_id: sessionId, from, to });
      await context.eventManager.publish(
        new Event("agent_file_moved", { session_id: sessionId, from, to })
      );
      return createTextResult(`Moved ${from} to ${to}`, { from, to });
    },
  };

  return [listFiles, readFile, writeFile, deleteFile, makeDirectory, moveFile];
};
