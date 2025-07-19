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
      
      // Create data directory if it doesn't exist
      const dataDir = path.resolve(docConfig.localStoreDir);
      await fs.mkdir(dataDir, { recursive: true });
      
      // Load existing topics from filesystem
      await this.loadTopicsFromFilesystem();
      
      // Add default topics if none exist
      if (this.topics.length === 0) {
        await this.addDefaultTopics();
      }
      
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
  async getAvailableTopics(category?: string, tags?: string[]): Promise<TopicsResponse> {
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
   * Search topics by keyword
   */
  async searchTopics(keyword: string): Promise<DocumentationTopic[]> {
    this.ensureInitialized();
    
    const searchTerm = keyword.toLowerCase();
    
    return this.topics.filter(topic =>
      topic.name.toLowerCase().includes(searchTerm) ||
      topic.description.toLowerCase().includes(searchTerm) ||
      topic.category.toLowerCase().includes(searchTerm) ||
      topic.tags.some(tag => tag.toLowerCase().includes(searchTerm))
    );
  }

  /**
   * Get topic by ID
   */
  async getTopicById(id: string): Promise<DocumentationTopic | null> {
    this.ensureInitialized();
    return this.topics.find(topic => topic.id === id) || null;
  }

  /**
   * Get topic content
   */
  async getTopicContent(id: string): Promise<string | null> {
    this.ensureInitialized();
    
    const topic = await this.getTopicById(id);
    if (!topic) return null;
    
    try {
      const contentPath = path.join(docConfig.localStoreDir, `${id}.txt`);
      const content = await fs.readFile(contentPath, 'utf-8');
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

  private async loadTopicsFromFilesystem(): Promise<void> {
    try {
      const dataDir = path.resolve(docConfig.localStoreDir);
      const files = await fs.readdir(dataDir);
      
      // Look for .txt files and create topics
      for (const file of files) {
        if (file.endsWith('.txt')) {
          const id = file.replace('.txt', '');
          const filePath = path.join(dataDir, file);
          const content = await fs.readFile(filePath, 'utf-8');
          
          // Parse basic info from content (you can enhance this)
          const topic = this.parseTopicFromContent(id, content);
          if (topic) {
            this.topics.push(topic);
          }
        }
      }
    } catch (error) {
      console.warn('No existing topics found, will create defaults');
    }
  }

  private parseTopicFromContent(id: string, content: string): DocumentationTopic | null {
    // Simple parser - you can enhance this
    const lines = content.split('\n');
    const title = lines[0]?.replace(/^#\s*/, '') || id;
    
    return {
      id,
      name: title,
      description: `Documentation for ${title}`,
      category: this.inferCategory(title),
      tags: this.inferTags(title, content),
      lastUpdated: new Date(),
      llmFilePath: path.join(docConfig.localStoreDir, `${id}.txt`)
    };
  }

  private inferCategory(title: string): string {
    const lower = title.toLowerCase();
    if (lower.includes('yfiles') || lower.includes('graph')) return 'yFiles';
    if (lower.includes('mcp')) return 'MCP';
    if (lower.includes('api')) return 'API';
    return 'General';
  }

  private inferTags(title: string, content: string): string[] {
    const tags: string[] = [];
    const text = (title + ' ' + content).toLowerCase();
    
    // Common tags
    if (text.includes('group')) tags.push('grouping');
    if (text.includes('node')) tags.push('nodes');
    if (text.includes('edge')) tags.push('edges');
    if (text.includes('layout')) tags.push('layout');
    if (text.includes('graph')) tags.push('graph');
    if (text.includes('yfiles')) tags.push('yfiles');
    
    return tags;
  }

  private async addDefaultTopics(): Promise<void> {
    // Add default yfiles topics
    const defaultTopics: DocumentationTopic[] = [
      {
        id: 'yfiles-grouping',
        name: 'yFiles Grouping - Complete Guide',
        description: 'Comprehensive guide to grouping in yFiles including hierarchical structures, folding, layout algorithms, styling, and best practices. Covers basic implementation, advanced features, and common use cases like organizational charts and network diagrams.',
        category: 'yFiles',
        tags: ['grouping', 'nodes', 'hierarchy', 'folding', 'layout', 'parent-child', 'organization', 'nesting'],
        lastUpdated: new Date(),
        llmFilePath: path.join(docConfig.localStoreDir, 'yfiles-grouping.txt'),
        version: '2.6.0'
      },
      {
        id: 'yfiles-layout',
        name: 'yFiles Layout Algorithms',
        description: 'Overview of layout algorithms available in yFiles',
        category: 'yFiles',
        tags: ['layout', 'algorithms', 'graph'],
        lastUpdated: new Date(),
        llmFilePath: path.join(docConfig.localStoreDir, 'yfiles-layout.txt')
      },
      {
        id: 'yfiles-graph-structure',
        name: 'yFiles Graph Structure',
        description: 'Understanding the basic graph structure in yFiles',
        category: 'yFiles',
        tags: ['graph', 'nodes', 'edges', 'structure'],
        lastUpdated: new Date(),
        llmFilePath: path.join(docConfig.localStoreDir, 'yfiles-graph-structure.txt')
      }
    ];

    this.topics = defaultTopics;
    
    // Create sample content files
    await this.createSampleContent();
  }

  private async createSampleContent(): Promise<void> {
    const sampleContents = {
      'yfiles-grouping': `# yFiles Grouping - Complete Guide

yFiles provides powerful grouping capabilities that allow you to organize your graph elements hierarchically. This comprehensive guide covers everything you need to know about grouping in yFiles.

## Overview

Grouping in yFiles allows you to:
- Create hierarchical structures by nesting nodes within parent nodes
- Organize complex graphs into logical sections
- Implement expand/collapse functionality for better navigation
- Apply specialized layout algorithms for grouped content
- Maintain parent-child relationships automatically

## Key Concepts

### Group Nodes
Group nodes are special nodes that can contain other nodes (children). They act as containers and can be:
- **Expanded**: Children are visible and can be interacted with
- **Collapsed**: Children are hidden, showing only the group node

### Hierarchical Structure
- **Parent Node**: A group node that contains other nodes
- **Child Node**: A node that belongs to a group
- **Nesting**: Groups can contain other groups, creating multiple hierarchy levels
- **Root Level**: Nodes that don't belong to any group

## Basic Implementation

### Creating Group Nodes

\`\`\`typescript
// Create a simple group node
const groupNode = graph.createGroupNode();

// Create a group node with bounds
const groupWithBounds = graph.createGroupNode(new Rect(0, 0, 200, 150));

// Create a group node with a label
const labeledGroup = graph.createGroupNode();
graph.addLabel(labeledGroup, 'Department A');
\`\`\`

### Adding Children to Groups

\`\`\`typescript
// Create child nodes
const childNode1 = graph.createNode();
const childNode2 = graph.createNode();

// Set parent-child relationships
graph.setParent(childNode1, groupNode);
graph.setParent(childNode2, groupNode);

// Alternative: Create node with parent directly
const childNode3 = graph.createNode(groupNode);
\`\`\`

### Working with Nested Groups

\`\`\`typescript
// Create a nested group structure
const departmentGroup = graph.createGroupNode();
const teamGroup = graph.createGroupNode();

// Make team a child of department
graph.setParent(teamGroup, departmentGroup);

// Add employees to team
const employee1 = graph.createNode();
const employee2 = graph.createNode();
graph.setParent(employee1, teamGroup);
graph.setParent(employee2, teamGroup);
\`\`\`

## Group Layout Algorithms

### Hierarchical Layout for Groups

\`\`\`typescript
import { HierarchicalLayout } from 'yfiles';

const layout = new HierarchicalLayout();
layout.recursiveGroupLayering = true;
layout.nodeToNodeDistance = 30;
layout.groupNodeInsets = new Insets(10);

await graphComponent.morphLayout(layout);
\`\`\`

### Organic Layout for Groups

\`\`\`typescript
import { OrganicLayout } from 'yfiles';

const layout = new OrganicLayout();
layout.groupNodeMode = GroupNodeMode.LAYOUT_GROUPS;
layout.minimumNodeDistance = 50;

await graphComponent.morphLayout(layout);
\`\`\`

### Custom Group Layout

\`\`\`typescript
import { GenericLayoutData } from 'yfiles';

const layoutData = new GenericLayoutData();
layoutData.addItemCollection(HierarchicalLayoutData.LAYERED_GROUPS, [groupNode]);

await graphComponent.morphLayout(new HierarchicalLayout(), layoutData);
\`\`\`

## Interactive Folding

### Enabling Folding

\`\`\`typescript
// Enable folding support
const foldingManager = new FoldingManager();
const foldingView = foldingManager.createFoldingView();
graphComponent.graph = foldingView.graph;

// Get the master graph for modifications
const masterGraph = foldingView.manager.masterGraph;
\`\`\`

### Folding Operations

\`\`\`typescript
// Collapse a group
foldingView.collapse(groupNode);

// Expand a group
foldingView.expand(groupNode);

// Toggle folding state
if (foldingView.isExpanded(groupNode)) {
  foldingView.collapse(groupNode);
} else {
  foldingView.expand(groupNode);
}

// Check if node is a group
const isGroup = foldingView.isGroupNode(node);
\`\`\`

## Styling Group Nodes

### Basic Group Styling

\`\`\`typescript
import { ShapeNodeStyle, Stroke, Fill } from 'yfiles';

// Create a custom style for group nodes
const groupStyle = new ShapeNodeStyle({
  shape: 'round-rectangle',
  fill: Fill.from('lightblue'),
  stroke: Stroke.from('darkblue', 2)
});

// Apply style to group nodes
graph.setStyle(groupNode, groupStyle);
\`\`\`

### Template-Based Group Styling

\`\`\`typescript
import { TemplateNodeStyle } from 'yfiles';

const groupTemplate = \`
<rect fill="lightgray" stroke="gray" stroke-width="2" 
      width="{TemplateBinding width}" height="{TemplateBinding height}"/>
<text x="10" y="20" font-family="Arial" font-size="14" font-weight="bold">
  {Binding name}
</text>
\`;

const templateStyle = new TemplateNodeStyle(groupTemplate);
graph.setStyle(groupNode, templateStyle);
\`\`\`

## Advanced Features

### Group Node Resizing

\`\`\`typescript
// Enable automatic resizing of group nodes
const groupingSupport = new GroupingSupport(graphComponent.graph);
groupingSupport.groupNodeInsets = new Insets(20);

// Manual resizing
const newBounds = new Rect(0, 0, 300, 200);
graph.setNodeLayout(groupNode, newBounds);
\`\`\`

### Group Node Events

\`\`\`typescript
// Listen for group changes
graph.addNodeCreatedListener((sender, args) => {
  if (graph.isGroupNode(args.item)) {
    console.log('Group node created:', args.item);
  }
});

// Listen for parent changes
graph.addParentChangedListener((sender, args) => {
  console.log('Node parent changed:', args.item, 'New parent:', args.newParent);
});
\`\`\`

### Group Node Bounds Calculation

\`\`\`typescript
// Calculate bounds to fit all children
const childBounds = graph.getChildren(groupNode)
  .map(child => graph.getNodeLayout(child))
  .reduce((bounds, childLayout) => bounds.getUnion(childLayout), Rect.EMPTY);

// Add padding
const padding = 20;
const groupBounds = childBounds.getEnlarged(padding);
graph.setNodeLayout(groupNode, groupBounds);
\`\`\`

## Common Use Cases

### 1. Organizational Charts

\`\`\`typescript
// Create department structure
const company = graph.createGroupNode();
graph.addLabel(company, 'Company');

const engineering = graph.createGroupNode();
graph.addLabel(engineering, 'Engineering');
graph.setParent(engineering, company);

const marketing = graph.createGroupNode();
graph.addLabel(marketing, 'Marketing');
graph.setParent(marketing, company);

// Add employees
const cto = graph.createNode();
graph.addLabel(cto, 'CTO');
graph.setParent(cto, engineering);
\`\`\`

### 2. Network Diagrams

\`\`\`typescript
// Create network zones
const dmz = graph.createGroupNode();
graph.addLabel(dmz, 'DMZ');

const internalNetwork = graph.createGroupNode();
graph.addLabel(internalNetwork, 'Internal Network');

// Add servers to zones
const webServer = graph.createNode();
graph.addLabel(webServer, 'Web Server');
graph.setParent(webServer, dmz);

const dbServer = graph.createNode();
graph.addLabel(dbServer, 'Database Server');
graph.setParent(dbServer, internalNetwork);
\`\`\`

### 3. Process Flows

\`\`\`typescript
// Create process groups
const dataProcessing = graph.createGroupNode();
graph.addLabel(dataProcessing, 'Data Processing');

const validation = graph.createGroupNode();
graph.addLabel(validation, 'Validation');
graph.setParent(validation, dataProcessing);

// Add process steps
const validateInput = graph.createNode();
graph.addLabel(validateInput, 'Validate Input');
graph.setParent(validateInput, validation);
\`\`\`

## Best Practices

### 1. Group Node Sizing
- Always ensure group nodes are large enough to contain their children
- Use automatic sizing when possible
- Provide adequate padding around child nodes

### 2. Layout Considerations
- Use appropriate layout algorithms for grouped content
- Consider the visual hierarchy when choosing layouts
- Test both expanded and collapsed states

### 3. Performance Tips
- Use folding for large graphs with many groups
- Implement lazy loading for deeply nested structures
- Consider virtualization for very large hierarchies

### 4. User Experience
- Provide clear visual indicators for group nodes
- Implement intuitive expand/collapse interactions
- Use consistent styling across group levels

## Troubleshooting

### Common Issues

1. **Group bounds not updating**: Ensure GroupingSupport is properly configured
2. **Children not visible**: Check if group node bounds are sufficient
3. **Layout problems**: Verify that the layout algorithm supports grouping
4. **Performance issues**: Consider using folding for large hierarchies

### Debug Tips

\`\`\`typescript
// Check group relationships
console.log('Is group node:', graph.isGroupNode(node));
console.log('Parent:', graph.getParent(node));
console.log('Children:', graph.getChildren(node).toArray());

// Verify bounds
console.log('Group bounds:', graph.getNodeLayout(groupNode));
console.log('Children bounds:', graph.getChildren(groupNode)
  .map(child => graph.getNodeLayout(child)));
\`\`\`

## Conclusion

yFiles grouping provides a powerful way to organize and structure complex graphs. By understanding the concepts of parent-child relationships, folding, and group-aware layouts, you can create intuitive and scalable graph visualizations. Remember to consider both the visual hierarchy and user interaction patterns when implementing grouping in your applications.

For more advanced scenarios, explore the yFiles documentation on custom group node implementations and specialized layout algorithms.`,

      'yfiles-layout': `# yFiles Layout Algorithms

yFiles offers a comprehensive set of layout algorithms for different graph types and use cases.

## Popular Layout Algorithms

- **Hierarchical Layout**: For directed graphs with flow-like structures
- **Organic Layout**: For general graphs with natural, organic appearance
- **Orthogonal Layout**: For graphs with orthogonal edge routing
- **Tree Layout**: For tree structures
- **Circular Layout**: For circular arrangements

## Layout Configuration

Each layout algorithm can be configured with various parameters to achieve the desired appearance.

## Example Usage

\`\`\`typescript
// Apply hierarchical layout
const layout = new HierarchicalLayout();
graph.applyLayout(layout);
\`\`\``,

      'yfiles-graph-structure': `# yFiles Graph Structure

Understanding the fundamental graph structure is essential for working with yFiles.

## Core Components

- **Nodes**: Vertices in the graph
- **Edges**: Connections between nodes
- **Labels**: Text annotations
- **Ports**: Connection points for edges

## Graph Model

The graph model in yFiles provides a clean separation between:
- Structure (nodes and edges)
- Presentation (visual appearance)
- Behavior (user interaction)

## Working with Graphs

\`\`\`typescript
// Create nodes
const node1 = graph.createNode();
const node2 = graph.createNode();

// Create edge
const edge = graph.createEdge(node1, node2);
\`\`\``
    };

    // Write sample content files
    for (const [id, content] of Object.entries(sampleContents)) {
      const filePath = path.join(docConfig.localStoreDir, `${id}.txt`);
      await fs.writeFile(filePath, content, 'utf-8');
    }
  }
}
