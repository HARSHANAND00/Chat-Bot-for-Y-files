// Documentation topic interface
export interface DocumentationTopic {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  llmFilePath: string;
  lastUpdated: Date;
  version?: string;
}

// Local store interface
export interface LocalDocStore {
  topics: DocumentationTopic[];
  categories: string[];
  lastSync: Date;
}

// Scraping interfaces
export interface ScrapingRequest {
  url: string;
  options?: ScrapingOptions;
}

export interface ScrapingOptions {
  maxDepth?: number;
  followLinks?: boolean;
  extractMainContent?: boolean;
  removeNavigation?: boolean;
}

export interface ScrapingResult {
  url: string;
  title: string;
  content: string;
  metadata: {
    wordCount: number;
    extractedAt: Date;
    contentType: string;
    language?: string;
  };
  links?: string[];
}

// Response interfaces
export interface TopicsResponse {
  topics: DocumentationTopic[];
  totalCount: number;
  categories: string[];
}

export interface ContentResponse {
  content: string;
  metadata: {
    source: string;
    extractedAt: Date;
    wordCount: number;
  };
}
