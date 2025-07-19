import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import http from "http";
import { URL } from "url";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { transportConfig, serverConfig } from "../config/serverConfig.js";
import { ToolRegistry } from "../registry/toolRegistry.js";
import { documentationToolDefinitions } from "../definitions/documentationDefinitions.js";

// Helper function to register tools on a server instance
function registerToolsOnServer(server: McpServer): void {
  const toolRegistry = new ToolRegistry();
  documentationToolDefinitions.forEach(tool => {
    toolRegistry.register(tool);
  });
  toolRegistry.registerAll(server);
}

export class SSETransportServer {
  private app: express.Application;
  private server: http.Server | null = null;
  private mcpServer: McpServer;
  private port: number;
  private host: string;
  private sessions: Map<string, SSEServerTransport> = new Map();
  private connections: Map<string, any> = new Map(); // Track MCP connections

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
        activeSessions: this.sessions.size,
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
        activeSessions: this.sessions.size,
      });
    });

    // 404 handler for non-SSE routes
    this.app.use("*", (req: Request, res: Response) => {
      // Don't handle SSE endpoint here - it's handled by raw HTTP server
      if (req.path === transportConfig.sse.endpoints.sse) {
        return; // Let the raw HTTP server handle it
      }
      
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

  private async handleSSEConnection(req: http.IncomingMessage, res: http.ServerResponse, url: URL): Promise<void> {
    try {
      console.error(`Handling SSE ${req.method} request from ${req.socket.remoteAddress}`);
      
      if (req.method === 'POST') {
        // Handle POST requests - these are MCP messages
        const sessionId = url.searchParams.get('sessionId');
        
        if (!sessionId) {
          console.error('Missing sessionId parameter in POST request');
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Missing sessionId parameter' }));
          return;
        }

        const transport = this.sessions.get(sessionId);
        if (!transport) {
          console.error(`Session not found for sessionId: ${sessionId}`);
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Session not found' }));
          return;
        }

        console.error(`Processing MCP message for session: ${sessionId}`);
        
        // Use raw HTTP objects directly with the MCP transport
        try {
          return await transport.handlePostMessage(req, res);
        } catch (error) {
          console.error(`Error in handlePostMessage:`, error);
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
              error: "Internal Server Error",
              message: "Failed to process MCP message",
              details: error instanceof Error ? error.message : "Unknown error"
            }));
          }
        }
        
      } else if (req.method === 'GET') {
        // Handle GET requests - establish SSE connection
        
        // Set SSE headers
 
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Headers", "*");
        res.setHeader("Access-Control-Allow-Methods", "*");

        
        console.error(`SSE headers sent, creating transport for ${req.socket.remoteAddress}`);
        
        // Create SSE transport with raw HTTP response
        const transport = new SSEServerTransport("/sse", res);
        
        // Store session
        this.sessions.set(transport.sessionId, transport);
        
        console.error(`SSE session established: ${transport.sessionId}`);
        
        // Create a new MCP server instance for this connection
        const serverInstance = new McpServer({
          name: serverConfig.name,
          version: serverConfig.version,
          capabilities: serverConfig.capabilities,
        });
        
        // Register all tools on this server instance
        registerToolsOnServer(serverInstance);
        
        console.error(`Tools registered on server instance for session: ${transport.sessionId}`);
        
        // Connect this server instance to the transport
        const connection = await serverInstance.connect(transport);
        
        // Store the connection
        this.connections.set(transport.sessionId, connection);
        
        console.error(`SSE client connected and MCP server connected from ${req.socket.remoteAddress}`);

        // Handle client disconnect
        req.on("close", () => {
          console.error(`SSE client disconnected from ${req.socket.remoteAddress}`);
          this.sessions.delete(transport.sessionId);
          const conn = this.connections.get(transport.sessionId);
          if (conn) {
            conn.close().catch((e: any) => console.error("Error closing connection:", e));
            this.connections.delete(transport.sessionId);
          }
        });

        req.on("error", (error: any) => {
          console.error(`SSE connection error from ${req.socket.remoteAddress}:`, error);
          this.sessions.delete(transport.sessionId);
          const conn = this.connections.get(transport.sessionId);
          if (conn) {
            conn.close().catch((e: any) => console.error("Error closing connection:", e));
            this.connections.delete(transport.sessionId);
          }
        });

        // Handle response errors
        res.on("error", (error: any) => {
          console.error(`SSE response error from ${req.socket.remoteAddress}:`, error);
          this.sessions.delete(transport.sessionId);
          const conn = this.connections.get(transport.sessionId);
          if (conn) {
            conn.close().catch((e: any) => console.error("Error closing connection:", e));
            this.connections.delete(transport.sessionId);
          }
        });

      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }

    } catch (error) {
      console.error("Error handling SSE connection:", error);
      console.error("Error stack:", error instanceof Error ? error.stack : "No stack trace");
      
      // Only send error response if headers haven't been sent yet
      if (!res.headersSent) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          error: "Internal Server Error",
          message: "Failed to establish SSE connection",
          details: error instanceof Error ? error.message : "Unknown error"
        }));
      }
    }
  }

  public async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Create HTTP server with Express app and custom SSE handling
        this.server = http.createServer((req, res) => {
          const url = new URL(req.url!, `http://${req.headers.host}`);
          
          // Handle SSE endpoint with raw HTTP
          if (url.pathname === transportConfig.sse.endpoints.sse) {
            this.handleSSEConnection(req, res, url);
            return;
          }
          
          // For all other routes, use Express
          this.app(req, res);
        });

        this.server.listen(this.port, this.host, () => {
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
      // Clean up all connections
      for (const [sessionId, connection] of this.connections) {
        connection.close().catch((e: any) => console.error("Error closing connection:", e));
      }
      this.connections.clear();
      
      // Clean up all sessions
      this.sessions.clear();
      
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
