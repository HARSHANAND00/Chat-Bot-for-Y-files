import { z } from "zod";
import { DocumentationService } from "../services/documentationService.js";
import { ScrapingService } from "../services/scrapingService.js";
import { createErrorResponse, createSuccessResponse } from "../registry/toolRegistry.js";

const documentationService = new DocumentationService();
const scrapingService = new ScrapingService();

// Initialize services
let servicesInitialized = false;

async function ensureServicesInitialized() {
  if (!servicesInitialized) {
    await documentationService.initialize();
    servicesInitialized = true;
  }
}

// Schema definitions
export const getTopicsSchema = {
  // No parameters needed - just return all available topics
};

export const getTopicContentSchema = {
  topicId: z.string().describe("The ID of the topic to get content for"),
};

export const scrapeWebsiteSchema = {
  url: z.string().url().describe("Website URL to scrape"),
  options: z.object({
    maxDepth: z.number().min(1).max(3).optional().describe("Maximum depth for link following"),
    followLinks: z.boolean().optional().describe("Whether to follow internal links"),
    extractMainContent: z.boolean().optional().describe("Extract only main content"),
    removeNavigation: z.boolean().optional().describe("Remove navigation elements"),
    includeImages: z.boolean().optional().describe("Include image references"),
  }).optional().default({}).describe("Optional scraping configuration - use empty object {} if not needed"),
};

/**
 * Get available documentation topics
 */
export async function handleGetTopics() {
  try {
    await ensureServicesInitialized();

    console.log(`🔍 Getting all available documentation topics`);
    
    // Get all topics without any filtering
    const result = await documentationService.getAvailableTopics();

    // Format response for LLM
    const topicsText = result.topics.map(topic => {
      const tagsText = topic.tags.length > 0 ? ` [Tags: ${topic.tags.join(', ')}]` : '';
      return `• ${topic.name} (${topic.category})${tagsText}\n  ${topic.description}\n  ID: ${topic.id}`;
    }).join('\n\n');

    const categoriesText = result.categories.length > 0 
      ? `\nAvailable Categories: ${result.categories.join(', ')}` 
      : '';

    const responseText = `# Documentation Topics Available\n\n` +
      `This server can help with ${result.totalCount} topic(s):\n\n${topicsText}${categoriesText}\n\n` +
      `To get detailed content for any topic, use the 'get-topic-content' tool with the topic ID.`;

    return createSuccessResponse(responseText);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error getting topics';
    return createErrorResponse(`Failed to get documentation topics: ${message}`);
  }
}

/**
 * Get content for a specific documentation topic
 */
export async function handleGetTopicContent({
  topicId 
}: { 
  topicId: string; 
}) {
  try {
    await ensureServicesInitialized();
    
    console.log(`🔍 Getting content for topic: ${topicId}`);
    
    const content = await documentationService.getTopicContent(topicId);

    if (!content) {
      return createErrorResponse(`Topic '${topicId}' not found or has no content`);
    }
    
    // Return clean LLM.txt content without modifications
    return createSuccessResponse(content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error getting topic content';
    return createErrorResponse(`Failed to get topic content: ${message}`);
  }
}

/**
 * Scrape website content
 */
export async function handleScrapeWebsite({ 
  url, 
  options 
}: { 
  url: string; 
  options?: any; 
}) {
  try {
    // Ensure options is an object, default to empty object if not provided
    const scrapingOptions = options && typeof options === 'object' ? options : {};
    
    console.log(`🔍 Scraping content from: ${url}`);
    
    const result = await scrapingService.scrapeWebsite({ url, options: scrapingOptions });
 console.log(`🔍 Scraping content from: ${JSON.stringify(result)}`);
    return createSuccessResponse(result.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error scraping website';
    return createErrorResponse(`Failed to scrape website: ${message}`);
  }
}