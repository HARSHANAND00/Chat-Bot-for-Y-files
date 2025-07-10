import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Tool registration interface
export interface ToolDefinition {
  name: string;
  description: string;
  schema: Record<string, any>;
  handler: (params: any) => Promise<any>;
}

// Tool registry class
export class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  register(tool: ToolDefinition): void {
    this.tools.set(tool.name, tool);
  }

  registerAll(server: McpServer): void {
    for (const [name, tool] of this.tools) {
      server.tool(name, tool.description, tool.schema, tool.handler);
    }
  }

  getTool(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAllTools(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }
}

// Helper function to create error responses
export function createErrorResponse(message: string) {
  return {
    content: [{
      type: "text" as const,
      text: message,
    }],
  };
}

// Helper function to create success responses
export function createSuccessResponse(text: string) {
  return {
    content: [{
      type: "text" as const,
      text,
    }],
  };
}
