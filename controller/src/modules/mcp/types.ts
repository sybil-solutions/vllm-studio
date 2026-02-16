/**
 * MCP server configuration.
 */
export interface McpServer {
  id: string;
  name: string;
  enabled: boolean;
  command: string;
  args: string[];
  env: Record<string, string>;
  description: string | null;
  url: string | null;
}

/**
 * MCP tool description.
 */
export interface McpTool {
  name: string;
  description?: string | null;
  inputSchema?: Record<string, unknown> | null;
  server: string;
}
