import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ToolRegistry } from "./registry/toolRegistry.js";
import { documentationToolDefinitions } from "./definitions/documentationDefinitions.js";
import { serverConfig } from "./config/serverConfig.js";
import { SSETransportServer } from "./transport/sseTransport.js";
import { parseArgs, printHelp, CLIOptions } from "./utils/cli.js";

// Create server instance
const server = new McpServer({
  name: serverConfig.name,
  version: serverConfig.version,
  capabilities: serverConfig.capabilities,
});

// Setup tool registry and register all tools
const toolRegistry = new ToolRegistry();

// Register documentation tools
documentationToolDefinitions.forEach(tool => {
  toolRegistry.register(tool);
});

// Register all tools with the server
toolRegistry.registerAll(server);

async function startStdioTransport(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("📡 Documentation MCP Server running on stdio transport");
}

async function startSSETransport(options: CLIOptions): Promise<void> {
  const sseServer = new SSETransportServer(
    server,
    options.port,
    options.host
  );
  
  await sseServer.start();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error('\n🛑 Received SIGINT, shutting down gracefully...');
    await sseServer.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error('\n🛑 Received SIGTERM, shutting down gracefully...');
    await sseServer.stop();
    process.exit(0);
  });
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    console.log(`🔍 Parsing command line arguments: ${args.join(" ")}`);
    const options = parseArgs(args);

    // Show help if requested
    if (options.help) {
      printHelp();
      process.exit(0);
    }

    console.error(`🚀 Starting MCP Documentation Server...`);
    console.error(`📋 Server: ${serverConfig.name} v${serverConfig.version}`);
    console.error(`🔧 Transport: ${options.transport}`);

    // Start the appropriate transport
    switch (options.transport) {
      case "stdio":
        await startStdioTransport();
        break;
        
      case "sse":
        await startSSETransport(options);
        break;
        
      default:
        throw new Error(`Unsupported transport: ${options.transport}`);
    }
    
  } catch (error) {
    if (error instanceof Error) {
      console.error(`❌ Error: ${error.message}`);
      if (error.message.includes("Unknown option") || error.message.includes("Invalid")) {
        console.error("\nUse --help to see available options");
      }
    } else {
      console.error("❌ Unknown error occurred:", error);
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("💥 Fatal error in main():", error);
  process.exit(1);
});