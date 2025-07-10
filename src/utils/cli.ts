export interface CLIOptions {
  transport: "stdio" | "sse";
  port?: number;
  host?: string;
  help?: boolean;
}

export function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {
    transport: "stdio", // default
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    switch (arg.split("=")[0]) {
      case "--transport":
      case "-t":
        const transport = arg.split("=")[1];
        if (transport === "stdio" || transport === "sse") {
          options.transport = transport;
        } else {
          throw new Error(`Invalid transport: ${transport}. Use 'stdio' or 'sse'`);
        }
        break;
        
      case "--port":
      case "-p":
        const port = parseInt(arg.split("=")[1], 10);
        if (isNaN(port) || port < 1 || port > 65535) {
          throw new Error(`Invalid port: ${args[i]}. Must be between 1 and 65535`);
        }
        options.port = port;
        break;
        
      case "--help":
        options.help = true;
        break;
        
      default:
        if (arg.startsWith("-")) {
          throw new Error(`Unknown option: ${arg}`);
        }
        break;
    }
  }

  return options;
}

export function printHelp(): void {
  console.log(`
MCP Documentation Server

USAGE:
  node dist/index.js [OPTIONS]

OPTIONS:
  --transport, -t <type>    Transport type: 'stdio' or 'sse' (default: stdio)
  --port, -p <number>       Port for SSE transport (default: 3000)
  --host <string>           Host for SSE transport (default: localhost)
  --help                    Show this help message

EXAMPLES:
  # Run with stdio transport (default)
  node dist/index.js
  node dist/index.js --transport stdio

  # Run with SSE transport
  node dist/index.js --transport sse
  node dist/index.js --transport sse --port 8080
  node dist/index.js --transport sse --port 8080 --host 0.0.0.0

NPM SCRIPTS:
  npm run dev              # Build and run with stdio
  npm run dev:stdio        # Build and run with stdio
  npm run dev:sse          # Build and run with SSE on port 3000
  
  npm run start            # Run built version with stdio
  npm run start:stdio      # Run built version with stdio
  npm run start:sse        # Run built version with SSE on port 3000
`);
}
