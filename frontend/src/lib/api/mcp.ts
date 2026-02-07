// CRITICAL
import type { MCPServer, MCPTool } from "../types";
import type { ApiCore } from "./core";

export function createMcpApi(core: ApiCore) {
  return {
    getMCPServers: async (): Promise<{ servers: MCPServer[] }> => {
      const data = await core.request<MCPServer[] | { servers?: MCPServer[] }>("/mcp/servers");
      const servers = Array.isArray(data) ? data : (data?.servers ?? []);
      return { servers };
    },

    getMCPTools: async (): Promise<{
      tools: MCPTool[];
      errors?: Array<{ server: string; error: string }>;
    }> => {
      const data = await core.request<{
        tools?: Array<{
          name: string;
          description?: string;
          input_schema?: unknown;
          inputSchema?: unknown;
          server: string;
        }>;
        errors?: Array<{ server: string; error: string }>;
      }>("/mcp/tools");

      const tools = Array.isArray(data?.tools)
        ? data.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            server: tool.server,
            inputSchema: (tool.inputSchema ?? tool.input_schema) as
              | Record<string, unknown>
              | undefined,
          }))
        : [];

      return { tools, errors: data?.errors ?? undefined };
    },

    getMCPServerTools: async (serverId: string): Promise<{ tools: MCPTool[] }> => {
      const data = await core.request<{
        tools?: Array<{
          name: string;
          description?: string;
          input_schema?: unknown;
          inputSchema?: unknown;
          server?: string;
        }>;
      }>(`/mcp/servers/${serverId}/tools`);

      const tools = Array.isArray(data?.tools)
        ? data.tools.map((tool) => ({
            name: tool.name,
            description: tool.description,
            server: tool.server || serverId,
            inputSchema: (tool.inputSchema ?? tool.input_schema) as
              | Record<string, unknown>
              | undefined,
          }))
        : [];

      return { tools };
    },

    callMCPTool: (
      server: string,
      tool: string,
      args: Record<string, unknown>,
    ): Promise<{ result: unknown }> =>
      core.request(`/mcp/tools/${server}/${tool}`, { method: "POST", body: JSON.stringify(args) }),

    addMCPServer: (server: unknown): Promise<void> =>
      core.request("/mcp/servers", { method: "POST", body: JSON.stringify(server) }),

    updateMCPServer: (serverId: string, server: unknown): Promise<void> =>
      core.request(`/mcp/servers/${serverId}`, { method: "PUT", body: JSON.stringify(server) }),

    removeMCPServer: (serverId: string): Promise<void> =>
      core.request(`/mcp/servers/${serverId}`, { method: "DELETE" }),
  };
}

