import { ScrapingRequest, ScrapingResult } from '../types/documentationTypes.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { URL } from 'url'
import { franc } from 'franc-min';
export class ScrapingService {
  /**
   * Scrape content from a website URL
   */
  async scrapeWebsite(request: ScrapingRequest): Promise<ScrapingResult> {
    const { url, options = {} } = request;

    const visited = new Set<string>();
    const rootUrl = new URL(url).origin;
    const maxDepth = options.maxDepth ?? 1;
    const followLinks = options.followLinks ?? false;
    const linksCollected: Set<string> = new Set();
    const allContent: string[] = [];
    let pageTitle = '';

    const scrapePage = async (currentUrl: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentUrl)) return;
      visited.add(currentUrl);

      const response = await axios.get(currentUrl);
      const $ = cheerio.load(response.data);

      if (depth === 1) {
        pageTitle = $('title').text().trim();
      }

      if (options.removeNavigation) {
        $('nav, header, footer, aside, .nav, .menu').remove();
      }

      let textContent = '';
      if (options.extractMainContent) {
        const main = $('main').html() || $('#main').html() || $('.content').html();
        textContent = main ? cheerio.load(main).text().trim() : $('body').text().trim();
      } else {
        textContent = $('body').text().trim();
      }

      if (options.includeImages) {
        const images = $('img')
          .map((_, el) => $(el).attr('src'))
          .get()
          .filter(Boolean)
          .map(src => new URL(src, currentUrl).href);

        if (images.length > 0) {
          textContent += `\n\nImages:\n` + images.map(src => `- ${src}`).join('\n');
        }
      }

      allContent.push(`\n\n[${currentUrl}]\n${textContent}`);

      if (followLinks && depth < maxDepth) {
        const internalLinks = $('a[href]')
          .map((_, el) => $(el).attr('href'))
          .get()
          .filter(href => href && !href.startsWith('#'))
          .map(href => new URL(href, currentUrl).href)
          .filter(link => link.startsWith(rootUrl));

        for (const link of internalLinks) {
          linksCollected.add(link);
          await scrapePage(link, depth + 1);
        }
      }
    };

    try {
      await scrapePage(url, 1);

      const fullContent = allContent.join('\n\n---\n\n');
      return {
        url,
        title: pageTitle,
        content: fullContent,
        metadata: {
          wordCount: this.countWords(fullContent),
          extractedAt: new Date(),
          contentType: 'text/html',
          language: this.detectLanguage(fullContent),
        },
        links: followLinks ? Array.from(linksCollected) : undefined,
      };
    } catch (error) {
      throw new Error(`Failed to scrape ${url}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private countWords(text: string): number {
    return text.split(/\s+/).filter(Boolean).length;
  }

  private detectLanguage(text: string): string {
    const langCode = franc(text, { minLength: 10 });
    return langCode !== 'und' ? langCode : 'unknown';
  }
}
