import { ToolDefinition } from "../registry/toolRegistry.js";
import { 
  getTopicsSchema, 
  scrapeWebsiteSchema,
  handleGetTopics, 
  handleScrapeWebsite 
} from "../tools/documentationTools.js";

export const documentationToolDefinitions: ToolDefinition[] = [
  {
    name: "get-documentation-topics",
    description: "Get available documentation topics that this server can help with. Returns llm.txt content for supported documentation pages stored locally.",
    schema: getTopicsSchema,
    handler: handleGetTopics,
  },
  {
    name: "scrape-website",
    description: "Scrape content from a website URL and return the extracted content in a readable format.",
    schema: scrapeWebsiteSchema,
    handler: handleScrapeWebsite,
  },
];
