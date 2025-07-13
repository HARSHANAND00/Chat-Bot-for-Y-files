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
  category: z.string().optional().describe("Filter by category (optional)"),
  tags: z.array(z.string()).optional().describe("Filter by tags (optional)"),
  search: z.string().optional().describe("Search keyword (optional)"),
};

export const scrapeWebsiteSchema = {
  url: z.string().url().describe("Website URL to scrape"),
  options: z.object({
    maxDepth: z.number().min(1).max(3).optional().describe("Maximum depth for link following"),
    followLinks: z.boolean().optional().describe("Whether to follow internal links"),
    extractMainContent: z.boolean().optional().describe("Extract only main content"),
    removeNavigation: z.boolean().optional().describe("Remove navigation elements"),
    includeImages: z.boolean().optional().describe("Include image references"),
  }).optional().describe("Scraping options"),
};

/**
 * Get available documentation topics
 */
export async function handleGetTopics({ 
  category, 
  tags, 
  search 
}: { 
  category?: string; 
  tags?: string[]; 
  search?: string; 
}) {
  try {
    await ensureServicesInitialized();

    let result;

    if (search) {
      // If search term provided, search topics
      const searchResults = await documentationService.searchTopics(search);
      result = {
        topics: searchResults,
        totalCount: searchResults.length,
        categories: [...new Set(searchResults.map(t => t.category))],
      };
    } else {
      // Otherwise get filtered topics
      result = await documentationService.getAvailableTopics(category, tags);
    }

    // Format response for LLM
    const topicsText = result.topics.map(topic => {
      const tagsText = topic.tags.length > 0 ? ` [Tags: ${topic.tags.join(', ')}]` : '';
      return `• ${topic.name} (${topic.category})${tagsText}\n  ${topic.description}\n  ID: ${topic.id}`;
    }).join('\n\n');

    const categoriesText = result.categories.length > 0 
      ? `\nAvailable Categories: ${result.categories.join(', ')}` 
      : '';

    const responseText = `# Documentation Topics Available\n\n` +
      `Found ${result.totalCount} topic(s):\n\n${topicsText}${categoriesText}\n\n` +
      `To get the LLM.txt content for any topic, use the topic ID with the scrape-website tool or request specific documentation.`;

    return createSuccessResponse(responseText);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error getting topics';
    return createErrorResponse(`Failed to get documentation topics: ${message}`);
  }
}

/**
 * Scrape website content
 */
export async function handleScrapeWebsite({
  url, 
  options = {} 
}: {
  url: string; 
  options?: any; 
}) {
  try {
    const result = await scrapingService.scrapeWebsite({ url, options });
    //TODO
   

    return createSuccessResponse(result.content);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error scraping website';
    return createErrorResponse(`Failed to scrape website: ${message}`);
  }
}