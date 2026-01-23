/**
 * MCP XML Parser
 * Strips MCP tool call XML from content (MiroThinker/Qwen3 models)
 * Handles various malformations: missing <, space in closing tag, etc.
 */

import type { IMcpXmlParser } from "../types";

// Pattern for complete MCP tool blocks
const MCP_TOOL_PATTERN = /<?use_mcp_tool>[\s\S]*?<\/use_mcp[_ ]?tool>/gi;

// Pattern for incomplete MCP blocks at end of stream
const MCP_INCOMPLETE_PATTERN = /<use_mcp_tool>[\s\S]*$/gi;

// Pattern for orphaned fragments
const MCP_ORPHAN_PATTERN = /use_mcp_tool>[\s\S]*?<\/use_mcp[_ ]?tool>/gi;

export class McpXmlParser implements IMcpXmlParser {
  readonly name = "mcp-xml" as const;

  parse(input: string): string {
    if (!input) return input;

    let result = input;

    // Remove complete MCP tool blocks
    result = result.replace(MCP_TOOL_PATTERN, "");

    // Remove incomplete MCP blocks at end of stream
    result = result.replace(MCP_INCOMPLETE_PATTERN, "");

    // Clean up any orphaned fragments
    result = result.replace(MCP_ORPHAN_PATTERN, "");

    return result.trim();
  }

  canParse(input: string): boolean {
    return (
      MCP_TOOL_PATTERN.test(input) ||
      MCP_INCOMPLETE_PATTERN.test(input) ||
      input.includes("use_mcp_tool")
    );
  }
}

export const mcpXmlParser = new McpXmlParser();
