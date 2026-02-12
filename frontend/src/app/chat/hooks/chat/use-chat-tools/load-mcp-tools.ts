// CRITICAL
"use client";

import type { MutableRefObject } from "react";
import api from "@/lib/api";
import type { MCPServer, MCPTool } from "@/lib/types";

export async function loadMcpToolsImpl({
  mcpEnabled,
  mcpServersRef,
  setMcpTools,
}: {
  mcpEnabled: boolean;
  mcpServersRef: MutableRefObject<MCPServer[]>;
  setMcpTools: (tools: MCPTool[]) => void;
}): Promise<MCPTool[]> {
  if (!mcpEnabled) {
    setMcpTools([]);
    return [];
  }

  try {
    const currentServers = mcpServersRef.current;
    const enabledServers = currentServers.filter((server) => server.enabled ?? true);
    let tools: MCPTool[] = [];

    if (enabledServers.length > 0) {
      const serverTools = await Promise.all(
        enabledServers.map(async (server) => {
          const serverId = server.id ?? server.name;
          try {
            const result = await api.getMCPServerTools(serverId);
            return result.tools;
          } catch (err) {
            console.warn(`[MCP] failed to load tools from ${serverId}`, err);
            return [];
          }
        }),
      );
      tools = serverTools.flat();
    }

    if (tools.length === 0) {
      const data = await api.getMCPTools();
      tools = data.tools || [];

      if (data.errors && data.errors.length > 0) {
        console.warn("[MCP] tool discovery errors", data.errors);
      }

      if (tools.length === 0) {
        const { servers } = await api.getMCPServers();
        const enabledFromApi = servers.filter((server) => server.enabled ?? true);
        const serverTools = await Promise.all(
          enabledFromApi.map(async (server) => {
            const serverId = server.id ?? server.name;
            try {
              const result = await api.getMCPServerTools(serverId);
              return result.tools;
            } catch (err) {
              console.warn(`[MCP] failed to load tools from ${serverId}`, err);
              return [];
            }
          }),
        );
        tools = serverTools.flat();
      }
    }

    setMcpTools(tools);
    console.info("[MCP] loaded tools", { count: tools.length });
    return tools;
  } catch (err) {
    console.error("Failed to load MCP tools:", err);
    return [];
  }
}

