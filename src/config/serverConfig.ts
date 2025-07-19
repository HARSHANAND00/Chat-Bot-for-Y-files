export const serverConfig = {
  name: "MCP Documentation Server",
  version: "1.0.0",
  userAgent: "mcp-doc/1.0",
  capabilities: {
    resources: {},
    tools: {
      // Indicate that this server supports tools
      listChanged: true,
    },
  },
};

export const transportConfig = {
  stdio: {
    enabled: true,
  },
  sse: {
    enabled: true,
    port: 3000,
    host: "localhost",
    cors: {
      origin: "*",
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    },
    endpoints: {
      sse: "/sse",
      health: "/health",
      info: "/info",
    },
  },
};

export const docConfig = {
  maxRetries: 3,
  timeoutMs: 15000,
  maxContentLength: 50000,
  localStoreDir: "./data/llm-docs",
  supportedFormats: ["txt", "md", "html"],
  scraping: {
    userAgent: "MCP-Doc-Server/1.0",
    maxDepth: 1,
    respectRobots: true,
  },
};
