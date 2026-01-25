import { marked } from "marked";
import {
  extractBodyContent,
  extractSectionContent,
  extractSummaryFromContent,
  extractTitle,
  type PostSummary,
} from "./markdownParser";

// PostSummary型を再エクスポート
export type { PostSummary };

/**
 * 画像パスをアプリケーションのベースパスに変換する
 * @param src 画像のソースパス
 * @returns 変換後のパス
 */
const resolveImagePath = (src: string): string => {
  // images/ で始まる相対パスを /datasources/images/ に変換
  if (src.startsWith("images/")) {
    const base = import.meta.env.DEV ? "" : "/lazy-note";
    return `${base}/datasources/${src}`;
  }
  // それ以外はそのまま返す（外部URLなど）
  return src;
};

// カスタムレンダラーを作成
const renderer = new marked.Renderer();
renderer.image = ({ href, title, text }) => {
  const resolvedHref = resolveImagePath(href);
  const titleAttr = title ? ` title="${title}"` : "";
  return `<img src="${resolvedHref}" alt="${text}"${titleAttr}>`;
};

// markedの設定
marked.use({
  breaks: true, // 改行を<br>タグに変換
  gfm: true, // GitHub Flavored Markdownを有効化
  renderer,
});

/**
 * 投稿の完全なデータ（詳細ページで使用）
 * PostSummaryを継承して型の一貫性を保証
 */
export interface Post extends PostSummary {
  content: string;
  rawContent: string;
}

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

/**
 * 本番環境で静的ファイルからサマリーを取得する
 */
const getStaticPostSummaries = async (): Promise<PostSummary[]> => {
  const summaries: PostSummary[] = [];
  const modules = import.meta.glob("/datasources/*.md", {
    query: "?raw",
    import: "default",
  });

  for (const filePath in modules) {
    const content = (await modules[filePath]()) as string;
    const timestamp = filePath.split("/").pop()?.replace(".md", "") || "";
    if (timestamp) {
      summaries.push(extractSummaryFromContent(content, timestamp));
    }
  }

  return summaries.sort((a, b) => b.id.localeCompare(a.id));
};

/**
 * 全投稿のメタデータを取得（一覧表示用、高速化のためcontentを含まない）
 */
export const getAllPostSummaries = async (): Promise<PostSummary[]> => {
  try {
    if (import.meta.env.DEV) {
      // 開発環境ではAPIを使用（メタデータが直接返される）
      const response = await fetch("/api/posts");
      if (!response.ok) {
        return [];
      }
      // APIはソート済みのメタデータ配列を返す
      return await response.json();
    }
    // 本番環境では動的インポートを使用
    return await getStaticPostSummaries();
  } catch (error) {
    console.error("Error loading posts:", error);
    return [];
  }
};

/**
 * 全投稿を取得（後方互換性のため維持、詳細ページで使用）
 */
export const getAllPosts = async (): Promise<Post[]> => {
  try {
    // 開発環境ではAPIを使用、本番環境では静的ファイルを使用
    if (import.meta.env.DEV) {
      // まずメタデータを取得
      const summaries = await getAllPostSummaries();

      // 各投稿の本文を取得
      const posts = await Promise.all(
        summaries.map(async (summary) => {
          const fileResponse = await fetch(`/api/posts/${summary.id}`);

          if (!fileResponse.ok) {
            return null;
          }

          const content = await fileResponse.text();
          return parseMarkdown(content, summary.id);
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
          import: "default",
        });

        for (const filePath in modules) {
          const content = (await modules[filePath]()) as string;
          const timestamp = filePath.split("/").pop()?.replace(".md", "") || "";
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
