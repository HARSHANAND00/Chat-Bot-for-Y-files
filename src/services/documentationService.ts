import { DocumentationTopic, TopicsResponse } from '../types/documentationTypes.js';
import { docConfig } from '../config/serverConfig.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export class DocumentationService {
  private topics: DocumentationTopic[] = [];
  private initialized = false;

  /**
   * Initialize the documentation service
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔄 Initializing DocumentationService...');

      const defaultTopics: DocumentationTopic[] = [
        {
          id: 'yfiles-layout',
          name: 'yFiles Layout Algorithms',
          description: 'Overview of layout algorithms available in yFiles',
          category: 'yFiles',
          tags: ['layout', 'algorithms', 'graph'],
          lastUpdated: new Date(),
          llmFilePath: path.join(docConfig.localStoreDir, 'yfiles-layout.llm.txt')
        },
      
      ];

      this.topics = defaultTopics;
      
      
      this.initialized = true;
      console.log(`✅ DocumentationService initialized with ${this.topics.length} topics`);
    } catch (error) {
      console.error('Failed to initialize documentation service:', error);
      throw error;
    }
  }

  /**
   * Get all available documentation topics
   */
  public async getAvailableTopics(category?: string, tags?: string[]): Promise<TopicsResponse> {
    this.ensureInitialized();
    
    let filteredTopics = [...this.topics];
    
    // Filter by category if provided
    if (category) {
      filteredTopics = filteredTopics.filter(topic => 
        topic.category.toLowerCase().includes(category.toLowerCase())
      );
    }
    
    // Filter by tags if provided
    if (tags && tags.length > 0) {
      filteredTopics = filteredTopics.filter(topic =>
        tags.some(tag => topic.tags.includes(tag.toLowerCase()))
      );
    }
    
    // Get unique categories
    const categories = [...new Set(filteredTopics.map(t => t.category))];
    
    return {
      topics: filteredTopics,
      totalCount: filteredTopics.length,
      categories
    };
  }


  /**
   * Get topic by ID
   */
  private async getTopicById(id: string): Promise<DocumentationTopic | null> {
    this.ensureInitialized();
    return this.topics.find(topic => topic.id === id) || null;
  }

  /**
   * Get topic content
   */
  public async getTopicContent(id: string): Promise<string | null> {
    this.ensureInitialized();
    
    const topic = await this.getTopicById(id);
    if (!topic) return null;
    
    try {
      const content = await fs.readFile(topic.llmFilePath, 'utf-8');
      return content;
    } catch (error) {
      console.error(`Failed to read content for topic ${id}:`, error);
      return null;
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('DocumentationService not initialized. Call initialize() first.');
    }
  }

}
