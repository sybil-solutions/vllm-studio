// CRITICAL
import type { AgentTool, AgentToolResult } from "@mariozechner/pi-agent-core";
import type { TSchema } from "@sinclair/typebox";
import type { AppContext } from "../../../types/context";
import type { McpServer } from "../../mcp/types";
import { runMcpCommand } from "../../mcp/runner";
import { createTextResult } from "./tool-registry-common";

/**
 * Apply tool-specific argument normalization rules.
 * @param toolName - MCP tool name (no server prefix).
 * @param args - Tool arguments.
 * @returns Sanitized arguments.
 */
const sanitizeToolArguments = (
  toolName: string,
  args: Record<string, unknown>
): Record<string, unknown> => {
  const sanitized = { ...args };
  if (toolName === "get_code_context_exa") {
    const tokensNumber = Number(sanitized["tokensNum"] ?? 0);
    if (tokensNumber < 1000) {
      sanitized["tokensNum"] = 5000;
    }
  }
  return sanitized;
};

/**
 * Build MCP tools from configured servers.
 * @param context - Application context.
 * @returns Agent tools.
 */
export const buildMcpTools = async (context: AppContext): Promise<AgentTool[]> => {
  const servers = context.stores.mcpStore.list(true);
  const tools: AgentTool[] = [];

  for (const server of servers) {
    let result: Record<string, unknown>;
    try {
      result = await runMcpCommand(server as McpServer, "tools/list");
    } catch {
      continue;
    }

    const serverTools = Array.isArray(result["tools"]) ? result["tools"] : [];
    for (const tool of serverTools) {
      if (!tool || typeof tool !== "object") continue;
      const record = tool as Record<string, unknown>;
      const toolName = typeof record["name"] === "string" ? record["name"] : "";
      if (!toolName) continue;

      const fullName = `${server.id}__${toolName}`;
      const description = typeof record["description"] === "string" ? record["description"] : "";
      const inputSchema = (record["inputSchema"] ?? record["input_schema"] ?? {}) as TSchema;

      tools.push({
        name: fullName,
        label: fullName,
        description,
        parameters: inputSchema,
        execute: async (_toolCallId, params): Promise<AgentToolResult<Record<string, unknown>>> => {
          const sanitized = sanitizeToolArguments(toolName, params as Record<string, unknown>);
          const callResult = await runMcpCommand(server as McpServer, "tools/call", {
            name: toolName,
            arguments: sanitized,
          });
          const content = Array.isArray(callResult["content"]) ? callResult["content"] : [];
          const textParts: string[] = [];
          for (const item of content) {
            if (
              item &&
              typeof item === "object" &&
              (item as Record<string, unknown>)["type"] === "text"
            ) {
              textParts.push(String((item as Record<string, unknown>)["text"] ?? ""));
            }
          }
          if (textParts.length > 0) {
            return createTextResult(textParts.join("\n"), { raw: callResult });
          }
          return createTextResult(JSON.stringify(callResult, null, 2), { raw: callResult });
        },
      });
    }
  }

  return tools;
};
