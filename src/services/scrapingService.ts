import { ScrapingRequest, ScrapingResult } from '../types/documentationTypes.js';

export class ScrapingService {
  /**
   * Scrape content from a website URL
   */
  async scrapeWebsite(request: ScrapingRequest): Promise<ScrapingResult> {
    const { url, options = {} } = request;
    
    try {
      console.log(`🔍 Scraping content from: ${url}`);
      
      // Use fetch to get the webpage content
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const html = await response.text();
      
      // Basic content extraction - remove HTML tags and scripts
      let content = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '') // Remove styles
        .replace(/<[^>]*>/g, ' ') // Remove HTML tags
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim();
      
      // Extract title
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : 'No title found';
      
      // Extract links if requested
      let links: string[] | undefined;
      if (options.followLinks) {
        const linkMatches = html.match(/<a[^>]+href=['"]+([^'"]+)['"]+[^>]*>/gi) || [];
        links = linkMatches
          .map(link => {
            const hrefMatch = link.match(/href=['"]+([^'"]+)['"]+/i);
            return hrefMatch ? hrefMatch[1] : null;
          })
          .filter((link): link is string => link !== null && link.startsWith('http'))
          .slice(0, 10); // Limit to first 10 links
      }
      
      // Truncate content if too long (keep first 10000 characters)
      if (content.length > 10000) {
        content = content.substring(0, 10000) + '... [Content truncated]';
      }

      return {
        url,
        title,
        content,
        metadata: {
          wordCount: this.countWords(content),
          extractedAt: new Date(),
          contentType: response.headers.get('content-type') || 'text/html',
          language: this.detectLanguage(content),
        },
        links,
      };
    } catch (error) {
      throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectLanguage(text: string): string {
    // Simple language detection - just return 'en' for now
    // In a real implementation, you might use a language detection library
    return 'en';
  }
}
