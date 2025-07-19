import { ToolDefinition } from "../registry/toolRegistry.js";
import { 
  getTopicsSchema, 
  getTopicContentSchema,
  scrapeWebsiteSchema,
  handleGetTopics,
  handleGetTopicContent,
  handleScrapeWebsite 
} from "../tools/documentationTools.js";

export const documentationToolDefinitions: ToolDefinition[] = [
  {
    name: "get-documentation-topics",
    description: "Get available documentation topics that this server can help with. Returns a list of available topics with their IDs. Use this first to discover what topics are available.",
    schema: getTopicsSchema,
    handler: handleGetTopics,
  },
  {
    name: "get-topic-content",
    description: "Get the detailed content for a specific documentation topic by its ID. Use this after getting the topic list to retrieve the actual documentation content.",
    schema: getTopicContentSchema,
    handler: handleGetTopicContent,
  },
  {
    name: "scrape-website",
    description: "Scrape content from a website URL and return the extracted content in a readable format.",
    schema: scrapeWebsiteSchema,
    handler: handleScrapeWebsite,
  },
];
