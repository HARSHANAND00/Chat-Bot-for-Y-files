import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { transportConfig, serverConfig } from "../config/serverConfig.js";

export class SSETransportServer {
  private app: express.Application;
  private server: any;
  private mcpServer: McpServer;
  private port: number;
  private host: string;

  constructor(mcpServer: McpServer, port?: number, host?: string) {
    this.mcpServer = mcpServer;
    this.port = port || transportConfig.sse.port;
    this.host = host || transportConfig.sse.host;
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware(): void {
    this.app.use(cors(transportConfig.sse.cors));
    
    this.app.use(express.json());
    
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.error(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }

  private setupRoutes(): void {
    // Health check endpoint
    this.app.get(transportConfig.sse.endpoints.health, (req: Request, res: Response) => {
      res.json({
        status: "healthy",
        server: serverConfig.name,
        version: serverConfig.version,
        timestamp: new Date().toISOString(),
        transport: "sse",
      });
    });

    // Server info endpoint
    this.app.get(transportConfig.sse.endpoints.info, (req: Request, res: Response) => {
      res.json({
        name: serverConfig.name,
        version: serverConfig.version,
        capabilities: serverConfig.capabilities,
        transport: {
          type: "sse",
          endpoints: transportConfig.sse.endpoints,
        },
        documentation: {
          health: `http://${this.host}:${this.port}${transportConfig.sse.endpoints.health}`,
          sse: `http://${this.host}:${this.port}${transportConfig.sse.endpoints.sse}`,
        },
      });
    });

    // SSE endpoint for MCP communication
    this.app.get(transportConfig.sse.endpoints.sse, (req: Request, res: Response) => {
      this.handleSSEConnection(req, res);
    });

    // Handle POST requests for SSE (if needed for some clients)
    this.app.post(transportConfig.sse.endpoints.sse, (req: Request, res: Response) => {
      this.handleSSEConnection(req, res);
    });

    this.app.use("*", (req: Request, res: Response) => {
      res.status(404).json({
        error: "Not Found",
        message: `Route ${req.method} ${req.originalUrl} not found`,
        availableEndpoints: {
          health: transportConfig.sse.endpoints.health,
          info: transportConfig.sse.endpoints.info,
          sse: transportConfig.sse.endpoints.sse,
        },
      });
    });
  }

  private async handleSSEConnection(req: Request, res: Response): Promise<void> {
    try {
      // Set SSE headers
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      });

      // Create SSE transport
      const transport = new SSEServerTransport("/sse", res);
      
      // Connect MCP server to SSE transport
      await this.mcpServer.connect(transport);
      
      console.error(`SSE client connected from ${req.ip}`);

      // Handle client disconnect
      req.on("close", () => {
        console.error(`SSE client disconnected from ${req.ip}`);
        res.end();
      });

      req.on("error", (error: any) => {
        console.error(`SSE connection error from ${req.ip}:`, error);
        res.end();
      });

    } catch (error) {
      console.error("Error handling SSE connection:", error);
      res.status(500).json({
        error: "Internal Server Error",
        message: "Failed to establish SSE connection",
      });
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.port, this.host, () => {
          console.error(`🚀 MCP Documentation Server (SSE) running on http://${this.host}:${this.port}`);
          console.error(`📊 Health check: http://${this.host}:${this.port}${transportConfig.sse.endpoints.health}`);
          console.error(`ℹ️  Server info: http://${this.host}:${this.port}${transportConfig.sse.endpoints.info}`);
          console.error(`🔗 SSE endpoint: http://${this.host}:${this.port}${transportConfig.sse.endpoints.sse}`);
          resolve();
        });

        this.server.on("error", (error: any) => {
          if (error.code === "EADDRINUSE") {
            console.error(`❌ Port ${this.port} is already in use. Try a different port with --port flag.`);
          } else {
            console.error("❌ Server error:", error);
          }
          reject(error);
        });

      } catch (error) {
        reject(error);
      }
    });
  }

  public async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.error("SSE transport server stopped");
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  public getUrl(): string {
    return `http://${this.host}:${this.port}`;
  }

  public getSSEUrl(): string {
    return `http://${this.host}:${this.port}${transportConfig.sse.endpoints.sse}`;
  }
}
