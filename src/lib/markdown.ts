import { marked } from 'marked';

export interface Post {
  id: string;
  title: string;
  createdAt: string;
  content: string;
  author: string;
  rawContent: string;
}

const extractTitle = (lines: string[]): string => {
  const titleLine = lines.find(line => line.startsWith('# '));
  return titleLine ? titleLine.substring(2).trim() : '';
};

const extractSectionContent = (lines: string[], sectionName: string): string => {
  const sectionIndex = lines.findIndex(line => line.startsWith(`## ${sectionName}`));
  if (sectionIndex === -1) {
    return '';
  }
  
  const nextSectionIndex = lines.findIndex((line, index) => 
    index > sectionIndex && line.startsWith('## ')
  );
  
  const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
  const sectionLines = lines.slice(sectionIndex + 1, endIndex);
  
  const listItem = sectionLines.find(line => line.startsWith('- '));
  return listItem ? listItem.substring(2).trim() : '';
};

const extractBodyContent = (lines: string[]): string => {
  const bodyStartIndex = lines.findIndex(line => line.startsWith('## 本文'));
  if (bodyStartIndex === -1) {
    return '';
  }
  
  const nextSectionIndex = lines.findIndex((line, index) => 
    index > bodyStartIndex && line.startsWith('## ')
  );
  
  const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
  const bodyLines = lines.slice(bodyStartIndex + 1, endIndex);
  
  return bodyLines
    .filter(line => line.trim() !== '')
    .join('\n');
};

export const parseMarkdown = (content: string, timestamp: string): Post => {
  const lines = content.split('\n');
  
  const title = extractTitle(lines);
  const createdAt = extractSectionContent(lines, '投稿日時');
  const author = extractSectionContent(lines, '筆者名');
  const bodyContent = extractBodyContent(lines);

  return {
    id: timestamp,
    title,
    createdAt,
    content: marked(bodyContent) as string,
    author,
    rawContent: content
  };
};

export const getAllPosts = async (): Promise<Post[]> => {
  try {
    const response = await fetch('/datasources/');
    if (!response.ok) {
      return [];
    }
    
    const files = await response.text();
    const fileMatches = files.match(/href="(\d{14}\.md)"/g);
    
    if (!fileMatches) {
      return [];
    }
    
    const posts = await Promise.all(
      fileMatches.map(async (match) => {
        const filename = match.match(/href="([^"]+)"/)?.[1];
        if (!filename) {
          return null;
        }
        
        const timestamp = filename.replace('.md', '');
        const fileResponse = await fetch(`/datasources/${filename}`);
        
        if (!fileResponse.ok) {
          return null;
        }
        
        const content = await fileResponse.text();
        return parseMarkdown(content, timestamp);
      })
    );
    
    return posts
      .filter((post): post is Post => post !== null)
      .sort((a, b) => b.id.localeCompare(a.id));
  } catch (error) {
    console.error('Error loading posts:', error);
    return [];
  }
};

export const getPost = async (timestamp: string): Promise<Post | null> => {
  try {
    const response = await fetch(`/datasources/${timestamp}.md`);
    if (!response.ok) {
      return null;
    }
    
    const content = await response.text();
    return parseMarkdown(content, timestamp);
  } catch (error) {
    console.error('Error loading post:', error);
    return null;
  }
};