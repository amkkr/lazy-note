/**
 * `## メタ` セクションのパーサと関連型・エラー定義
 *
 * 設計書: docs/rfc/editorial-citrus/06-data-model.md
 *
 * - C1: `## メタ` セクション無し → null を返す（呼び出し元で既定値割当）
 * - C2: status が定義値 → 通常パース
 * - C3〜C7: パース失敗時は MetaParseError を throw（build fail）
 * - C8: published_at 省略時はファイル名から推定
 */

/**
 * 投稿の公開状態
 */
export type PostStatus = "draft" | "published" | "archived";

/**
 * 記事メタデータ
 */
export interface PostMeta {
  readonly status: PostStatus;
  readonly publishedAt: string;
  readonly updatedAt?: string;
  readonly tags: readonly string[];
}

/**
 * MetaParseError の発生コード（C3〜C7 に対応）
 */
export type MetaParseErrorCode =
  | "STATUS_REQUIRED"
  | "UNKNOWN_KEY"
  | "INVALID_VALUE"
  | "DUPLICATE_KEY"
  | "INVALID_DATETIME";

/**
 * `## メタ` セクションのパース失敗を表すエラー
 *
 * - file: 元のファイル名（エラーメッセージ用）
 * - line: エラーが発生した行番号（メタ本文の 1 始まり、特定不能なら省略）
 * - code: 5 種別のエラーコード
 */
export class MetaParseError extends Error {
  readonly code: MetaParseErrorCode;
  readonly file: string;
  readonly line?: number;

  constructor(
    code: MetaParseErrorCode,
    file: string,
    detail: string,
    line?: number,
  ) {
    const lineSuffix = typeof line === "number" ? `:${line}` : "";
    super(`[${file}${lineSuffix}] ${code}: ${detail}`);
    this.name = "MetaParseError";
    this.code = code;
    this.file = file;
    this.line = line;
  }
}

/**
 * 採用キーの集合（このリスト以外はすべて UNKNOWN_KEY）
 */
const KNOWN_KEYS = new Set<string>([
  "status",
  "published_at",
  "updated_at",
  "tags",
]);

/**
 * status の許容値
 */
const ALLOWED_STATUSES: readonly PostStatus[] = [
  "draft",
  "published",
  "archived",
];

/**
 * ISO 8601 形式（日時、タイムゾーン必須）の検証用正規表現
 *
 * 例: 2025-01-01T12:00:00+09:00, 2025-01-01T12:00:00Z, 2025-01-01T12:00:00.123+09:00
 */
const ISO_8601_DATETIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

/**
 * ISO 8601 形式かどうかを判定する
 *
 * - 形式の表面上のチェックに加え、Date でパース可能な実在日付であることを確認する
 */
const isIso8601 = (value: string): boolean => {
  if (!ISO_8601_DATETIME.test(value)) {
    return false;
  }
  const time = Date.parse(value);
  return Number.isFinite(time);
};

/**
 * Markdown 全文を行配列に変換する（CRLF / LF 双方を許容、BOM を除去）
 */
const splitLines = (markdown: string): string[] => {
  const stripped = markdown.replace(/^﻿/, "");
  return stripped.split(/\r\n|\r|\n/);
};

/**
 * `## メタ` セクション本文の行範囲を抽出する
 *
 * - セクションが存在しない場合は null
 * - 次の `## ` セクション開始までの行を返す
 */
interface MetaSectionLines {
  readonly lines: string[];
  readonly startLine: number;
}

const findMetaSectionLines = (markdown: string): MetaSectionLines | null => {
  const lines = splitLines(markdown);
  const headingIndex = lines.findIndex(
    (line) => line.trim() === "## メタ" || line.trim().startsWith("## メタ "),
  );
  if (headingIndex === -1) {
    return null;
  }

  const nextHeadingIndex = lines.findIndex(
    (line, index) => index > headingIndex && line.startsWith("## "),
  );
  const endIndex = nextHeadingIndex === -1 ? lines.length : nextHeadingIndex;
  return {
    lines: lines.slice(headingIndex + 1, endIndex),
    startLine: headingIndex + 1,
  };
};

/**
 * tags の値（例: `[typescript, design]` や `[]`）をパースする
 *
 * - 角括弧で囲まれていなければ INVALID_VALUE
 * - カンマ区切りでトリム、空配列も許容
 */
const parseTagsValue = (
  rawValue: string,
  file: string,
  line: number,
): string[] => {
  const trimmed = rawValue.trim();
  if (!(trimmed.startsWith("[") && trimmed.endsWith("]"))) {
    throw new MetaParseError(
      "INVALID_VALUE",
      file,
      `tags は配列形式 (例: [typescript, design]) で指定してください: "${rawValue}"`,
      line,
    );
  }
  const inner = trimmed.slice(1, -1).trim();
  if (inner.length === 0) {
    return [];
  }
  return inner
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

/**
 * ファイル名（例: `20250101120000.md` / `20250101120000`）から
 * publishedAt の ISO 8601 文字列を推定する
 *
 * - JST (+09:00) で固定する（既存記事は JST 想定）
 * - 桁数や数値が不正な場合は null を返す
 */
const inferPublishedAtFromFileName = (fileName: string): string | null => {
  const base = fileName.replace(/\.md$/, "");
  const match = base.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second] = match;
  const candidate = `${year}-${month}-${day}T${hour}:${minute}:${second}+09:00`;
  return isIso8601(candidate) ? candidate : null;
};

/**
 * メタ本文 1 行を `key: value` に分解する
 *
 * - 先頭の `- ` リストマーカーを許容
 * - 空行 / 空白のみの行 → null（無視）
 * - `:` を含まない行 → INVALID_VALUE
 */
interface ParsedKeyValue {
  readonly key: string;
  readonly value: string;
  readonly line: number;
}

const parseKeyValueLine = (
  rawLine: string,
  file: string,
  line: number,
): ParsedKeyValue | null => {
  const trimmed = rawLine.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const withoutMarker = trimmed.startsWith("- ")
    ? trimmed.substring(2).trim()
    : trimmed.startsWith("-")
      ? trimmed.substring(1).trim()
      : trimmed;
  if (withoutMarker.length === 0) {
    return null;
  }

  const colonIndex = withoutMarker.indexOf(":");
  if (colonIndex === -1) {
    throw new MetaParseError(
      "INVALID_VALUE",
      file,
      `key: value 形式で記述してください: "${rawLine}"`,
      line,
    );
  }
  const key = withoutMarker.substring(0, colonIndex).trim();
  const value = withoutMarker.substring(colonIndex + 1).trim();
  if (key.length === 0) {
    throw new MetaParseError(
      "INVALID_VALUE",
      file,
      `キーが空です: "${rawLine}"`,
      line,
    );
  }
  return { key, value, line };
};

/**
 * Markdown 全文から `## メタ` セクションを抽出してパースする
 *
 * - セクション無し → null（呼び出し元で C1 既定値を割り当てる）
 * - パース失敗 → MetaParseError を throw（build fail）
 *
 * @param markdown - 元の Markdown 全文
 * @param fileName - エラーメッセージ用（例: `20250101120000.md`）
 */
export const parseMetaSection = (
  markdown: string,
  fileName: string,
): PostMeta | null => {
  const section = findMetaSectionLines(markdown);
  if (section === null) {
    return null;
  }

  const seenKeys = new Set<string>();
  const entries: ParsedKeyValue[] = [];

  section.lines.forEach((rawLine, offset) => {
    const lineNumber = section.startLine + offset + 1;
    const parsed = parseKeyValueLine(rawLine, fileName, lineNumber);
    if (parsed === null) {
      return;
    }
    if (!KNOWN_KEYS.has(parsed.key)) {
      throw new MetaParseError(
        "UNKNOWN_KEY",
        fileName,
        `未知のキー "${parsed.key}" は使用できません`,
        parsed.line,
      );
    }
    if (seenKeys.has(parsed.key)) {
      throw new MetaParseError(
        "DUPLICATE_KEY",
        fileName,
        `キー "${parsed.key}" が重複しています`,
        parsed.line,
      );
    }
    seenKeys.add(parsed.key);
    entries.push(parsed);
  });

  // status は必須（C3）
  const statusEntry = entries.find((entry) => entry.key === "status");
  if (statusEntry === undefined) {
    throw new MetaParseError(
      "STATUS_REQUIRED",
      fileName,
      "## メタ セクションには status キーが必須です",
    );
  }
  if (!ALLOWED_STATUSES.includes(statusEntry.value as PostStatus)) {
    throw new MetaParseError(
      "INVALID_VALUE",
      fileName,
      `status の値は draft / published / archived のいずれかでなければなりません: "${statusEntry.value}"`,
      statusEntry.line,
    );
  }
  const status = statusEntry.value as PostStatus;

  // published_at（任意、省略時はファイル名から推定）
  const publishedAtEntry = entries.find(
    (entry) => entry.key === "published_at",
  );
  let publishedAt: string;
  if (publishedAtEntry === undefined) {
    const inferred = inferPublishedAtFromFileName(fileName);
    if (inferred === null) {
      throw new MetaParseError(
        "INVALID_DATETIME",
        fileName,
        `published_at が省略されていますが、ファイル名から ISO 8601 形式を推定できません: "${fileName}"`,
      );
    }
    publishedAt = inferred;
  } else {
    if (!isIso8601(publishedAtEntry.value)) {
      throw new MetaParseError(
        "INVALID_DATETIME",
        fileName,
        `published_at は ISO 8601 形式 (例: 2025-01-01T12:00:00+09:00) で指定してください: "${publishedAtEntry.value}"`,
        publishedAtEntry.line,
      );
    }
    publishedAt = publishedAtEntry.value;
  }

  // updated_at（任意）
  const updatedAtEntry = entries.find((entry) => entry.key === "updated_at");
  let updatedAt: string | undefined;
  if (updatedAtEntry !== undefined) {
    if (!isIso8601(updatedAtEntry.value)) {
      throw new MetaParseError(
        "INVALID_DATETIME",
        fileName,
        `updated_at は ISO 8601 形式 (例: 2025-01-03T18:30:00+09:00) で指定してください: "${updatedAtEntry.value}"`,
        updatedAtEntry.line,
      );
    }
    updatedAt = updatedAtEntry.value;
  }

  // tags（任意、空配列許容）
  const tagsEntry = entries.find((entry) => entry.key === "tags");
  const tags = tagsEntry
    ? parseTagsValue(tagsEntry.value, fileName, tagsEntry.line)
    : [];

  return {
    status,
    publishedAt,
    ...(updatedAt !== undefined ? { updatedAt } : {}),
    tags,
  };
};

/**
 * `## メタ` セクション無しの既定 PostMeta を生成する（C1 既定値割当）
 *
 * - 既存 16 記事の互換性のため、status は "published" 固定
 * - publishedAt はファイル名から推定。失敗時は INVALID_DATETIME を throw
 *
 * @param fileName - 例: `20250101120000.md`
 */
export const createDefaultMeta = (fileName: string): PostMeta => {
  const inferred = inferPublishedAtFromFileName(fileName);
  if (inferred === null) {
    throw new MetaParseError(
      "INVALID_DATETIME",
      fileName,
      `## メタ セクションが無く、ファイル名からも published_at を推定できません: "${fileName}"`,
    );
  }
  return {
    status: "published",
    publishedAt: inferred,
    tags: [],
  };
};
