#!/usr/bin/env node

/**
 * 新しい Markdown 記事を生成するスクリプト (Anchor / Cast 対応版)
 *
 * 設計書: epic #487 / Issue #490 (N-3 Cast)
 *
 * 役割:
 *   - 生成される .md の `## 本文` 直前に「個人史座標の火種」を
 *     HTML コメントとして仕込む。
 *   - 火種は執筆者が .md を開いたときだけ見える。公開ページでは
 *     `src/lib/sanitize.ts` の `sanitizePostHtml` (DOMPurify) が
 *     コメントを除去するため、画面に露出しない。
 *   - newPost 実行時に `datasources/milestones.json` の現状を
 *     標準出力に提示し、節目の追記を促す。
 *
 * 構造:
 *   - 純粋関数群 (export) はテスト可能。`scripts/__tests__/newPost.test.ts`
 *     から検証する。
 *   - CLI エントリポイント `createNewPost()` のみ副作用を持つ。
 *
 * 公開非露出の根拠:
 *   - `marked` は HTML コメントを HTML 出力にそのまま残す。
 *   - `sanitizePostHtml` (DOMPurify) の既定挙動が HTML コメントを除去する。
 *     したがって火種は .md ファイル内にのみ存在し、レンダ後の DOM には
 *     現れない。
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { basename, join } from "node:path";
import {
  computeCoordinates,
  computeElapsed,
  inferPublishedAt,
  type Milestone,
} from "../src/lib/anchors.ts";

// =============================================================================
// 型定義
// =============================================================================

/**
 * 直近の既存記事を表す軽量サマリ
 */
export interface PreviousPost {
  readonly fileName: string;
  readonly title: string;
  readonly publishedAt: string;
}

/**
 * `buildIgnitionComment` 入力
 *
 * - coordinates: 登録済み節目から算出された座標
 * - siteOpeningElapsed: milestones.json 不在時のフォールバック (最古記事日付からの経過)
 * - previousPost: 直近記事 (タイトル + 日付)。存在しない場合は null
 */
export interface IgnitionInput {
  readonly coordinates: readonly { label: string; tone: Milestone["tone"]; daysSince: number }[];
  readonly siteOpeningElapsed: { label: string; daysSince: number } | null;
  readonly previousPost: PreviousPost | null;
  readonly publishedAt: string;
}

// =============================================================================
// 純粋関数 (テスト可能)
// =============================================================================

/**
 * HTML コメント内に埋め込まれるラベルから、コメント終端 `-->` を
 * 偶発的に生成しうる `--` 連続を分解する。
 *
 * - HTML コメントは `-->` で閉じるため、ラベル内の `-->` や `--`
 *   が混入するとコメント構造が壊れる。
 * - 単純な置換 (`--` → `- -`) で十分にコメント終端を回避できる。
 * - 公開ページには DOMPurify によるコメント除去で出ないため、
 *   表示上の見栄えより構造保護を優先する。
 *
 * @param label - エスケープ対象のラベル文字列
 * @returns コメント内に安全に埋め込めるラベル
 */
export const escapeHtmlCommentLabel = (label: string): string => {
  return label.replace(/--/g, "- -");
};

/**
 * 火種 HTML コメントを構築する
 *
 * 仕様:
 *   - coordinates が空かつ siteOpeningElapsed/previousPost も無い場合は
 *     空文字列を返す (本文直前に何も差し込まない)。
 *   - tone:heavy の節目も Cast の火種に含める (Coordinate には出さない
 *     が Cast には出す段階的可視性。Issue #490 の AC)。
 *   - 各行は半角中点 `・` + ラベル + `から N 日(目)` の体裁で揃える。
 *   - 「サイト開設」は milestones.json 登録時は coordinates 経由で、
 *     未登録時は siteOpeningElapsed フォールバック経由で表示される。
 *
 * @param input - 座標・経過・直近記事の入力
 * @returns 本文直前に挿入する HTML コメント文字列 (末尾に改行を含む)
 */
export const buildIgnitionComment = (input: IgnitionInput): string => {
  const lines: string[] = [];

  for (const coord of input.coordinates) {
    const safeLabel = escapeHtmlCommentLabel(coord.label);
    const toneSuffix = coord.tone === "heavy" ? " [重い節目]" : "";
    lines.push(`・${safeLabel}から ${coord.daysSince} 日目${toneSuffix}`);
  }

  if (input.siteOpeningElapsed !== null) {
    const safeLabel = escapeHtmlCommentLabel(input.siteOpeningElapsed.label);
    lines.push(
      `・${safeLabel}から ${input.siteOpeningElapsed.daysSince} 日目`,
    );
  }

  if (input.previousPost !== null) {
    const safeTitle = escapeHtmlCommentLabel(input.previousPost.title);
    const days = computeElapsed(
      input.publishedAt,
      input.previousPost.publishedAt.slice(0, 10),
      "前回",
    ).daysSince;
    lines.push(`・前回の記事「${safeTitle}」から ${days} 日`);
  }

  if (lines.length === 0) {
    return "";
  }

  // 末尾は `-->\n\n` で終わる:
  //   - 後段の `buildPostMarkdown` で `${ignitionComment}## 本文` と直接連結
  //     するため、HTML コメント終端 `-->` と Markdown 見出し `## 本文` の
  //     間に空行 1 行を挟む。
  //   - 空行が無いと Markdown ファイルを開いたとき視認性が落ち、また
  //     marked のパース時にコメントと見出しが同一ブロック扱いされる
  //     リスクを避ける。
  return [
    "<!-- Anchor / Cast — 今日の座標",
    ...lines,
    "この座標を一行目の呼び水にしてもいいし、消してもいい。",
    "-->",
    "",
    "",
  ].join("\n");
};

/**
 * milestones.json をロードする
 *
 * - ファイルが存在しない場合は null を返す (フォールバック判定用)。
 * - 期待スキーマは `Milestone[]`。値検証はゆるく行う:
 *   - 配列でない場合は null
 *   - 各要素の date / label / tone が文字列でない、または tone が
 *     許容値 (neutral / light / heavy) 外の場合は除外する
 * - 厳密な値範囲検証 (#489 で導入予定) は将来差し替える。
 *
 * @param filePath - milestones.json の絶対パス
 * @returns 読み込んだ Milestone 配列。ファイル不在時は null
 */
export const loadMilestones = (filePath: string): Milestone[] | null => {
  if (!existsSync(filePath)) {
    return null;
  }
  const raw = readFileSync(filePath, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  const validTones = new Set<Milestone["tone"]>(["neutral", "light", "heavy"]);
  const result: Milestone[] = [];
  for (const item of parsed) {
    if (typeof item !== "object" || item === null) {
      continue;
    }
    const record = item as Record<string, unknown>;
    if (
      typeof record.date !== "string" ||
      typeof record.label !== "string" ||
      typeof record.tone !== "string"
    ) {
      continue;
    }
    if (!validTones.has(record.tone as Milestone["tone"])) {
      continue;
    }
    result.push({
      date: record.date,
      label: record.label,
      tone: record.tone as Milestone["tone"],
    });
  }
  return result;
};

/**
 * datasources 配下から `YYYYMMDDhhmmss.md` 命名のファイル一覧 (ソート済) を取得する
 *
 * - 命名規約外のファイル (例: README.md / images/) は除外する。
 * - 文字列昇順でソートし、ファイル名そのものが時系列順となる前提を活かす。
 */
export const listPostFileNames = (datasourcesDir: string): string[] => {
  if (!existsSync(datasourcesDir)) {
    return [];
  }
  return readdirSync(datasourcesDir)
    .filter((file) => /^\d{14}\.md$/.test(file))
    .sort();
};

/**
 * Markdown ファイルの 1 行目 `# タイトル` からタイトル文字列を抽出する
 *
 * - 先頭が `#` で始まる最初の見出し行を採用する (空行・BOM などは無視)。
 * - 抽出できなかった場合はファイル名 (拡張子なし) を返すフォールバック。
 *
 * @param markdown - .md の本文
 * @param fallbackFileName - フォールバックに使うファイル名
 */
export const extractMarkdownTitle = (
  markdown: string,
  fallbackFileName: string,
): string => {
  const lines = markdown.split(/\r?\n/);
  for (const line of lines) {
    const match = line.match(/^#\s+(.+?)\s*$/);
    if (match) {
      return match[1];
    }
  }
  return fallbackFileName.replace(/\.md$/, "");
};

/**
 * 新規作成中の記事の 1 つ前 (= 直近の既存記事) を取得する
 *
 * - newFileName より文字列辞書順で前にあるファイルのうち、最新のものを返す。
 * - 該当が無い場合は null。
 *
 * @param datasourcesDir - datasources 配下の絶対パス
 * @param newFileName - これから作成するファイル名 (例: 20260515091200.md)
 */
export const findPreviousPost = (
  datasourcesDir: string,
  newFileName: string,
): PreviousPost | null => {
  const files = listPostFileNames(datasourcesDir);
  const candidates = files.filter((file) => file < newFileName);
  if (candidates.length === 0) {
    return null;
  }
  const latest = candidates[candidates.length - 1];
  const publishedAt = inferPublishedAt(latest);
  if (publishedAt === null) {
    return null;
  }
  const filePath = join(datasourcesDir, latest);
  const content = readFileSync(filePath, "utf8");
  const title = extractMarkdownTitle(content, latest);
  return { fileName: latest, title, publishedAt };
};

/**
 * milestones.json 不在時のフォールバック「サイト開設からの経過」を計算する
 *
 * - 既存記事の最古のファイル名から ISO 8601 を推定し、その日付を
 *   サイト開設日として `computeElapsed` を呼ぶ。
 * - 既存記事が 0 件の場合は null (火種にサイト開設行を出さない)。
 *
 * @param datasourcesDir - datasources 配下の絶対パス
 * @param publishedAt - 新規作成中の記事の publishedAt (ISO 8601)
 */
export const computeSiteOpeningFallback = (
  datasourcesDir: string,
  publishedAt: string,
): { label: string; daysSince: number } | null => {
  const files = listPostFileNames(datasourcesDir);
  if (files.length === 0) {
    return null;
  }
  const oldest = files[0];
  const oldestIso = inferPublishedAt(oldest);
  if (oldestIso === null) {
    return null;
  }
  return computeElapsed(publishedAt, oldestIso.slice(0, 10), "サイト開設");
};

/**
 * 火種コメントを含む完全な .md 内容を生成する
 *
 * 既存出力との互換:
 *   - `# 新しい記事のタイトル` / `## 投稿日時` / `## 筆者名` / `## 本文` は
 *     旧 newPost.ts と同形のまま維持する (Issue #490 の制約)。
 *   - 火種コメントは `## 本文` 直前 (= 本文セクション直前) に挿入される。
 */
export const buildPostMarkdown = (params: {
  readonly displayDate: string;
  readonly authorName: string;
  readonly ignitionComment: string;
}): string => {
  return `# 新しい記事のタイトル

## 投稿日時
- ${params.displayDate}

## 筆者名
- ${params.authorName}

${params.ignitionComment}## 本文
記事の内容をここに書きます。

**太字**や*斜体*などのMarkdown記法が使用できます。
`;
};

/**
 * milestones.json の現状サマリを標準出力向け文字列に整形する
 *
 * - 登録ゼロ件 / 不在 / 件数有りで文言を切り替える。
 * - tone:heavy は明示マークを付け、執筆者の意識喚起を狙う。
 */
export const formatMilestonesSummary = (
  milestones: Milestone[] | null,
): string => {
  if (milestones === null) {
    return [
      "ℹ️  datasources/milestones.json は未作成です。",
      "    社会復帰・サイト開設・喪失体験など、自分の節目を JSON で登録すると",
      "    新規記事の火種に「○○から N 日目」が並びます。",
      "    例: [{ \"date\": \"2025-08-26\", \"label\": \"サイト開設\", \"tone\": \"neutral\" }]",
    ].join("\n");
  }
  if (milestones.length === 0) {
    return [
      "ℹ️  datasources/milestones.json は空です。",
      "    節目を 1 件以上登録すると、火種に座標が並ぶようになります。",
    ].join("\n");
  }
  const header = `📍 現在登録されている節目 (${milestones.length} 件):`;
  const items = milestones.map((m) => {
    const toneMark = m.tone === "heavy" ? " [重い節目]" : m.tone === "light" ? " [軽め]" : "";
    return `   - ${m.date}  ${m.label}${toneMark}`;
  });
  const footer = "    必要に応じて milestones.json に節目を追記してください。";
  return [header, ...items, footer].join("\n");
};

// =============================================================================
// CLI エントリポイント (副作用あり)
// =============================================================================

/**
 * 新しい Markdown 記事を生成する CLI 関数
 */
const createNewPost = (): void => {
  try {
    const now = new Date();
    const timestamp = now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\..+/, "")
      .replace("T", "");

    const displayDate = new Intl.DateTimeFormat("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Tokyo",
    }).format(now);

    let authorName = "Unknown";
    try {
      authorName = execSync("git config user.name", {
        encoding: "utf8",
      }).trim();
    } catch {
      console.warn(
        "警告: gitユーザー名を取得できませんでした。デフォルト値を使用します。",
      );
    }

    const fileName = `${timestamp}.md`;
    const datasourcesDir = join(process.cwd(), "datasources");
    const filePath = join(datasourcesDir, fileName);
    const publishedAt = inferPublishedAt(fileName);

    let ignitionComment = "";
    if (publishedAt !== null) {
      const milestonesPath = join(datasourcesDir, "milestones.json");
      const milestones = loadMilestones(milestonesPath);

      const coordinates = milestones
        ? computeCoordinates(publishedAt, milestones)
        : [];

      // milestones.json に「サイト開設」が登録済みなら座標経由で出る。
      // 未登録時 (= null) のみ最古記事日付からのフォールバックを使う。
      const siteOpeningElapsed =
        milestones === null
          ? computeSiteOpeningFallback(datasourcesDir, publishedAt)
          : null;

      const previousPost = findPreviousPost(datasourcesDir, fileName);

      ignitionComment = buildIgnitionComment({
        coordinates,
        siteOpeningElapsed,
        previousPost,
        publishedAt,
      });

      console.log(formatMilestonesSummary(milestones));
      console.log("");
    }

    const markdownContent = buildPostMarkdown({
      displayDate,
      authorName,
      ignitionComment,
    });

    writeFileSync(filePath, markdownContent, "utf8");

    console.log(`✅ 新しい記事を作成しました: ${fileName}`);
    console.log(`📝 ファイルパス: ${filePath}`);
    console.log(`🕐 投稿日時: ${displayDate}`);
    console.log(`👤 筆者名: ${authorName}`);
    console.log("");
    console.log("記事の内容を編集してください。");
  } catch (error) {
    console.error(
      "❌ 記事の作成中にエラーが発生しました:",
      (error as Error).message,
    );
    process.exit(1);
  }
};

// CLI として実行されたときのみ動かす (テストからの import で副作用しないため)
// 判定は `path.basename` 経由で行い、OS 依存のパス区切り (POSIX `/` /
// Windows `\\`) 双方で同じ結果になるようにする。本プロジェクトは
// macOS/Linux 前提だが、basename ベースなら CI を別 OS に持ち出した際にも
// 同じ判定が走るため移植性のコストは無視できる。
const isDirectInvocation =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  basename(process.argv[1]) === "newPost.ts";

if (isDirectInvocation) {
  createNewPost();
}
