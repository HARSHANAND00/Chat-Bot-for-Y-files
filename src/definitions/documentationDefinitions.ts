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
    description: "STEP 1: Get a list of all documentation topics available on this server. Returns topic names, descriptions, and IDs. Use this first to discover what topics are available.",
    schema: getTopicsSchema,
    handler: handleGetTopics,
  },
  {
    name: "get-topic-content",
    description: "STEP 2: Get the LLM.txt content for a specific documentation topic. This returns a structured overview with URLs that MUST be scraped next. The response will explicitly list URLs that you need to scrape using the scrape-website tool. Use the topic ID from get-documentation-topics.",
    schema: getTopicContentSchema,
    handler: handleGetTopicContent,
  },
  {
    name: "scrape-website",
    description: "STEP 3: REQUIRED after get-topic-content. Scrape content from URLs found in the topic content. This provides detailed documentation. You MUST call this for each URL listed in the get-topic-content response. Use only the 'url' parameter - the 'options' parameter is optional and defaults to {}.",
    schema: scrapeWebsiteSchema,
    handler: handleScrapeWebsite,
  },
];
