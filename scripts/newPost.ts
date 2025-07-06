#!/usr/bin/env node

import { execSync } from "child_process";
import { writeFileSync } from "fs";
import { join } from "path";

/**
 * 新しいMarkdown記事を生成するスクリプト
 */
function createNewPost(): void {
  try {
    // 現在の日時からタイムスタンプを生成
    const now = new Date();
    const timestamp = now.toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "")
      .replace("T", "");
    
    // 日本時間で表示用の日時を生成
    const displayDate = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo"
    }).format(now);
    
    // gitユーザー名を取得
    let authorName = "Unknown";
    try {
      authorName = execSync("git config user.name", { encoding: "utf8" }).trim();
    } catch (error) {
      console.warn("警告: gitユーザー名を取得できませんでした。デフォルト値を使用します。");
    }
    
    // Markdownファイルの内容を生成
    const markdownContent = `# 新しい記事のタイトル

## 投稿日時
- ${displayDate}

## 筆者名
- ${authorName}

## 本文
記事の内容をここに書きます。

**太字**や*斜体*などのMarkdown記法が使用できます。
`;
    
    // ファイルパスを生成
    const fileName = `${timestamp}.md`;
    const filePath = join(process.cwd(), "datasources", fileName);
    
    // ファイルを作成
    writeFileSync(filePath, markdownContent, "utf8");
    
    console.log(`✅ 新しい記事を作成しました: ${fileName}`);
    console.log(`📝 ファイルパス: ${filePath}`);
    console.log(`🕐 投稿日時: ${displayDate}`);
    console.log(`👤 筆者名: ${authorName}`);
    console.log("");
    console.log("記事の内容を編集してください。");
    
  } catch (error) {
    console.error("❌ 記事の作成中にエラーが発生しました:", (error as Error).message);
    process.exit(1);
  }
}

// スクリプトを実行
createNewPost();