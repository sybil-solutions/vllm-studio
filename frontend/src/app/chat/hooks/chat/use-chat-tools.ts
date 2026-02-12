// CRITICAL
"use client";

import { useCallback, useRef, useEffect } from "react";
import api from "@/lib/api";
import { safeJsonStringify } from "@/lib/safe-json";
import type { MCPTool, MCPServer, ToolResult } from "@/lib/types";
import { useAppStore } from "@/store";
import { useShallow } from "zustand/react/shallow";
import { loadMcpToolsImpl } from "./use-chat-tools/load-mcp-tools";

interface UseChatToolsOptions {
  mcpEnabled: boolean;
}

export function useChatTools({ mcpEnabled }: UseChatToolsOptions) {
  const {
    mcpTools,
    mcpServers,
    executingTools,
    toolResultsMap,
    setMcpTools,
    setMcpServers,
    setExecutingTools,
    updateExecutingTools,
    setToolResultsMap,
    updateToolResultsMap,
  } = useAppStore(
    useShallow((state) => ({
      mcpTools: state.mcpTools,
      mcpServers: state.mcpServers,
      executingTools: state.executingTools,
      toolResultsMap: state.toolResultsMap,
      setMcpTools: state.setMcpTools,
      setMcpServers: state.setMcpServers,
      setExecutingTools: state.setExecutingTools,
      updateExecutingTools: state.updateExecutingTools,
      setToolResultsMap: state.setToolResultsMap,
      updateToolResultsMap: state.updateToolResultsMap,
    })),
  );

  // Use ref to avoid re-creating loadMCPTools when mcpServers changes
  const mcpServersRef = useRef(mcpServers);
  const warnedNoEnabledServersRef = useRef(false);
  useEffect(() => { mcpServersRef.current = mcpServers; }, [mcpServers]);
  useEffect(() => { warnedNoEnabledServersRef.current = false; }, [mcpEnabled, mcpServers]);

  const normalizeServerId = useCallback((server: MCPServer) => {
    const base = (server.id ?? server.name).trim();
    const normalized = base
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
    return normalized || base;
  }, []);

  const loadMCPServers = useCallback(async () => {
    try {
      const { servers } = await api.getMCPServers();
      const normalizedServers: MCPServer[] = servers.map((server: MCPServer) => ({
        id: server.id ?? normalizeServerId(server),
        name: server.name,
        enabled: server.enabled ?? true,
        icon: server.icon,
        command: server.command,
        args: server.args || [],
        env: server.env || {},
      }));
      mcpServersRef.current = normalizedServers;
      setMcpServers(normalizedServers);
    } catch (err) {
      console.error("Failed to load MCP servers:", err);
    }
  }, [normalizeServerId, setMcpServers]);

  const loadMCPTools = useCallback(async (): Promise<MCPTool[]> => {
    return loadMcpToolsImpl({ mcpEnabled, mcpServersRef, setMcpTools });
  }, [mcpEnabled, mcpServersRef, setMcpTools]);

  const getToolDefinitions = useCallback(
    (toolsOverride?: MCPTool[]): MCPTool[] => {
      if (!mcpEnabled) return [];
      const toolsList = toolsOverride ?? mcpTools;
      // Use ref to avoid recreation on mcpServers changes
      const currentServers = mcpServersRef.current;
      const enabledServers =
        currentServers.length > 0
          ? new Set(
              currentServers
                .filter((server) => server.enabled)
                .map((server) => server.id ?? server.name),
            )
          : new Set<string>();
      const shouldFilter = enabledServers.size > 0;
      const filteredTools = shouldFilter
        ? toolsList.filter((tool) => enabledServers.has(tool.server))
        : toolsList;
      if (shouldFilter && filteredTools.length === 0 && toolsList.length > 0) {
        if (!warnedNoEnabledServersRef.current) {
          console.warn("[MCP] no enabled servers matched tools; using all tools");
          warnedNoEnabledServersRef.current = true;
        }
        return toolsList.map((tool: MCPTool) => ({
          name: `${tool.server}__${tool.name}`,
          server: tool.server,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }));
      }
      return filteredTools.map((tool: MCPTool) => ({
        name: `${tool.server}__${tool.name}`,
        server: tool.server,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));
    },
    [mcpEnabled, mcpTools],
  );

  const executeTool = useCallback(
    async (toolCall: { toolCallId: string; toolName: string; args?: Record<string, unknown> }) => {
      const { toolCallId, toolName: rawToolName, args } = toolCall;

      updateExecutingTools((prev) => new Set(prev).add(toolCallId));

      try {
        const nameParts = rawToolName.split("__");
        const resolvedToolName = nameParts.length > 1 ? nameParts.slice(1).join("__") : rawToolName;
        const serverFromName = nameParts.length > 1 ? nameParts[0] : "";
        const tool = mcpTools.find(
          (t) => t.name === resolvedToolName && (!serverFromName || t.server === serverFromName),
        );
        const server = serverFromName || tool?.server || "default";

        const result = await api.callMCPTool(server, resolvedToolName, args || {});

        const toolResult: ToolResult = {
          tool_call_id: toolCallId,
          content:
            typeof result.result === "string" ? result.result : safeJsonStringify(result.result, ""),
          isError: false,
        };

        updateToolResultsMap((prev) => new Map(prev).set(toolCallId, toolResult));
        return toolResult;
      } catch (err) {
        const errorResult: ToolResult = {
          tool_call_id: toolCallId,
          content: err instanceof Error ? err.message : "Tool execution failed",
          isError: true,
        };
        updateToolResultsMap((prev) => new Map(prev).set(toolCallId, errorResult));
        return errorResult;
      } finally {
        updateExecutingTools((prev) => {
          const next = new Set(prev);
          next.delete(toolCallId);
          return next;
        });
      }
    },
    [mcpTools, updateExecutingTools, updateToolResultsMap],
  );

  const addMcpServer = useCallback(
    async (server: MCPServer) => {
      const serverId = normalizeServerId(server);
      await api.addMCPServer({ ...server, id: serverId });
      await loadMCPServers();
    },
    [loadMCPServers, normalizeServerId],
  );

  const updateMcpServer = useCallback(
    async (server: MCPServer) => {
      const serverId = server.id ?? server.name;
      await api.updateMCPServer(serverId, server);
      await loadMCPServers();
    },
    [loadMCPServers],
  );

  const removeMcpServer = useCallback(
    async (serverId: string) => {
      await api.removeMCPServer(serverId);
      await loadMCPServers();
    },
    [loadMCPServers],
  );

  const clearToolResults = useCallback(() => {
    setToolResultsMap(new Map());
    setExecutingTools(new Set());
  }, [setExecutingTools, setToolResultsMap]);

  useEffect(() => {
    const handler = () => {
      void loadMCPServers().then(() => {
        if (mcpEnabled) {
          void loadMCPTools();
        }
      });
    };
    window.addEventListener("vllm:mcp-event", handler as EventListener);
    return () => {
      window.removeEventListener("vllm:mcp-event", handler as EventListener);
    };
  }, [loadMCPServers, loadMCPTools, mcpEnabled]);

  return {
    mcpTools,
    mcpServers,
    executingTools,
    toolResultsMap,
    loadMCPServers,
    loadMCPTools,
    getToolDefinitions,
    executeTool,
    addMcpServer,
    updateMcpServer,
    removeMcpServer,
    clearToolResults,
    setMcpServers,
  };
}
