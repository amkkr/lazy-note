import { marked } from "marked";

export interface Post {
  id: string;
  title: string;
  createdAt: string;
  content: string;
  author: string;
  rawContent: string;
}

const extractTitle = (lines: string[]): string => {
  const titleLine = lines.find((line) => line.startsWith("# "));
  return titleLine ? titleLine.substring(2).trim() : "";
};

const extractSectionContent = (
  lines: string[],
  sectionName: string,
): string => {
  const sectionIndex = lines.findIndex((line) =>
    line.startsWith(`## ${sectionName}`),
  );
  if (sectionIndex === -1) {
    return "";
  }

  const nextSectionIndex = lines.findIndex(
    (line, index) => index > sectionIndex && line.startsWith("## "),
  );

  const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
  const sectionLines = lines.slice(sectionIndex + 1, endIndex);

  const listItem = sectionLines.find((line) => line.startsWith("- "));
  return listItem ? listItem.substring(2).trim() : "";
};

const extractBodyContent = (lines: string[]): string => {
  const bodyStartIndex = lines.findIndex((line) => line.startsWith("## 本文"));
  if (bodyStartIndex === -1) {
    return "";
  }

  const nextSectionIndex = lines.findIndex(
    (line, index) => index > bodyStartIndex && line.startsWith("## "),
  );

  const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
  const bodyLines = lines.slice(bodyStartIndex + 1, endIndex);

  return bodyLines.filter((line) => line.trim() !== "").join("\n");
};

export const parseMarkdown = (content: string, timestamp: string): Post => {
  const lines = content.split("\n");

  const title = extractTitle(lines);
  const createdAt = extractSectionContent(lines, "投稿日時");
  const author = extractSectionContent(lines, "筆者名");
  const bodyContent = extractBodyContent(lines);

  return {
    id: timestamp,
    title,
    createdAt,
    content: marked(bodyContent) as string,
    author,
    rawContent: content,
  };
};

export const getAllPosts = async (): Promise<Post[]> => {
  try {
    // 開発環境ではAPIを使用、本番環境では静的ファイルを使用
    if (import.meta.env.DEV) {
      const response = await fetch("/api/posts");
      if (!response.ok) {
        return [];
      }

      const timestamps = await response.json();

      const posts = await Promise.all(
        timestamps.map(async (timestamp: string) => {
          const fileResponse = await fetch(`/api/posts/${timestamp}`);

          if (!fileResponse.ok) {
            return null;
          }

          const content = await fileResponse.text();
          return parseMarkdown(content, timestamp);
        }),
      );

      return posts
        .filter((post): post is Post => post !== null)
        .sort((a, b) => b.id.localeCompare(a.id));
    } else {
      // 本番環境では動的インポートを使用して静的ファイルを読み込み
      const posts: Post[] = [];
      
      // 既知のMarkdownファイルを動的にインポート
      try {
        const modules = import.meta.glob("/datasources/*.md", { 
          query: "?raw", 
          import: "default" 
        });
        
        for (const path in modules) {
          const content = await modules[path]() as string;
          const timestamp = path.split("/").pop()?.replace(".md", "") || "";
          if (timestamp) {
            posts.push(parseMarkdown(content, timestamp));
          }
        }
      } catch (error) {
        console.error("Error loading static posts:", error);
      }

      return posts.sort((a, b) => b.id.localeCompare(a.id));
    }
  } catch (error) {
    console.error("Error loading posts:", error);
    return [];
  }
};

export const getPost = async (timestamp: string): Promise<Post | null> => {
  try {
    // 開発環境ではAPIを使用、本番環境では静的ファイルを使用
    if (import.meta.env.DEV) {
      const response = await fetch(`/api/posts/${timestamp}`);
      if (!response.ok) {
        return null;
      }

      const content = await response.text();
      return parseMarkdown(content, timestamp);
    } else {
      // 本番環境では動的インポートを使用
      try {
        const module = await import(`../../datasources/${timestamp}.md?raw`);
        const content = module.default;
        return parseMarkdown(content, timestamp);
      } catch (error) {
        console.error(`Error loading post ${timestamp}:`, error);
        return null;
      }
    }
  } catch (error) {
    console.error("Error loading post:", error);
    return null;
  }
};
