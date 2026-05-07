# 06. データモデル

## 設計方針

- **既存 16 記事は無改変**。互換性の番人ペルソナ C を死守
- 既存の `## 投稿日時` セクション形式を **絶対に廃止しない**
- メタ拡張は `## メタ` セクションを **追記する形** (任意) でのみ行う
- フロントマター (YAML) への破壊的移行は **しない**
- パーサのエラーは **build fail を基本** とする (silent default で誤公開を防ぐ)

## 既存フォーマット (温存)

```markdown
# 記事タイトル

## 投稿日時
- 2025-01-01 12:00

## 筆者名
- 著者名

## 本文
記事の本文……
```

このフォーマットは Editorial Citrus でも **完全に動き続けます**。

## 拡張: `## メタ` セクション (任意)

新規記事や、既存記事への状態追加は以下のように `## メタ` セクションを追記します。

```markdown
# 記事タイトル

## 投稿日時
- 2025-01-01 12:00

## 筆者名
- 著者名

## メタ
- status: draft
- published_at: 2025-01-01T12:00:00+09:00
- updated_at: 2025-01-03T18:30:00+09:00
- tags: [typescript, design]

## 本文
記事の本文……
```

### 採用キー一覧

| キー           | 型                                  | 必須       | 説明                                              |
| -------------- | ----------------------------------- | ---------- | ------------------------------------------------- |
| `status`       | `"draft" \| "published" \| "archived"` | **必須** (`## メタ` がある場合) | 公開状態 |
| `published_at` | ISO 8601 文字列                     | 任意       | 公開日時。省略時は **ファイル名から推定**         |
| `updated_at`   | ISO 8601 文字列                     | 任意       | 更新日時 (記事末尾の「Updated」表示等に利用)      |
| `tags`         | 文字列配列                          | 任意       | タグ。空配列許容。Ext-4 タグページで使用          |

## ルール表 (C1〜C8)

| ID  | 条件                                              | 挙動                                                                |
| --- | ------------------------------------------------- | ------------------------------------------------------------------- |
| C1  | `## メタ` セクションが **存在しない**             | `status = "published"` を **既定** とする (既存 16 記事互換)        |
| C2  | `## メタ` あり、`status` が `draft\|published\|archived` のいずれか | 通常パース、その値を採用                                  |
| C3  | `## メタ` あり、`status` キーが **欠落**          | **build fail** (`MetaParseError: STATUS_REQUIRED`)                  |
| C4  | `## メタ` 内に **未知のキー**                     | **build fail** (`MetaParseError: UNKNOWN_KEY`)                      |
| C5  | `status` が定義値以外 (例: `"draft1"`)            | **build fail** (`MetaParseError: INVALID_VALUE`)                    |
| C6  | 同一キーが **重複定義**                           | **build fail** (`MetaParseError: DUPLICATE_KEY`)                    |
| C7  | `published_at` / `updated_at` が **ISO 8601 違反** | **build fail** (`MetaParseError: INVALID_DATETIME`)                |
| C8  | `published_at` 省略                               | **ファイル名 (`YYYYMMDDHHMMSS.md`) から推定**して埋める             |

> C3〜C7 のいずれかに該当した場合、`build` (= `pnpm build`) は exit 1 で停止します。CI でも同様。

## `parseMetaSection` 関数仕様

```ts
// src/lib/meta.ts (Issue #0c で実装)
type Status = "draft" | "published" | "archived";

interface PostMeta {
  status: Status;
  publishedAt: string;     // ISO 8601
  updatedAt?: string;      // ISO 8601
  tags: string[];
}

class MetaParseError extends Error {
  readonly code:
    | "STATUS_REQUIRED"      // C3
    | "UNKNOWN_KEY"          // C4
    | "INVALID_VALUE"        // C5
    | "DUPLICATE_KEY"        // C6
    | "INVALID_DATETIME";    // C7
  readonly file: string;
  readonly line?: number;
}

/**
 * Markdown 全文から `## メタ` セクションを抽出してパースする。
 * - セクション無し → null を返す (呼び出し元で C1 既定値を割り当て)
 * - パース失敗 → MetaParseError を throw (build fail)
 *
 * @param markdown - 元の Markdown 全文
 * @param fileName - エラーメッセージ用 (例: `20250101120000.md`)
 */
function parseMetaSection(markdown: string, fileName: string): PostMeta | null;
```

### `MetaParseError` 5 種別

| code               | 発生条件                  | 対応する C       |
| ------------------ | ------------------------- | ---------------- |
| `STATUS_REQUIRED`  | `## メタ` 内 status 欠落  | C3               |
| `UNKNOWN_KEY`      | 未知のキー                | C4               |
| `INVALID_VALUE`    | status 値が定義外         | C5               |
| `DUPLICATE_KEY`    | 同一キー重複              | C6               |
| `INVALID_DATETIME` | ISO 8601 違反             | C7               |

エラーメッセージは `fileName` と該当 `line` を必ず含め、修正箇所を即特定できるようにします。

## テストケース表 (T1〜T12)

| ID  | 入力                                                                 | 期待                                                |
| --- | -------------------------------------------------------------------- | --------------------------------------------------- |
| T1  | 既存 16 記事 (`## メタ` 無し)                                        | 全て `status = "published"`、parse 成功 (C1)        |
| T2  | `## メタ\n- status: draft`                                           | `status = "draft"` (C2)                             |
| T3  | `## メタ\n- status: published`                                       | `status = "published"` (C2)                         |
| T4  | `## メタ\n- status: archived`                                        | `status = "archived"` (C2)                          |
| T5  | `## メタ\n- published_at: 2025-01-01T12:00:00+09:00\n- status: ...`  | publishedAt がパースされる                          |
| T6  | `## メタ\n- tags: [typescript, design]`                              | tags = `["typescript", "design"]` (status 欠落で C3) |
| T7  | `## メタ\n- status: published\n- foo: bar`                           | `MetaParseError(UNKNOWN_KEY)` (C4)                  |
| T8  | `## メタ\n- status: draft1`                                          | `MetaParseError(INVALID_VALUE)` (C5)                |
| T9  | `## メタ\n- status: draft\n- status: published`                      | `MetaParseError(DUPLICATE_KEY)` (C6)                |
| T10 | `## メタ\n- status: published\n- published_at: not-a-date`           | `MetaParseError(INVALID_DATETIME)` (C7)             |
| T11 | `## メタ` セクション本文に空行がある                                 | 空行は無視され、後続項目もパースされる              |
| T12 | ファイル名 `20250101120000.md` + `## メタ\n- status: published` (publishedAt 省略) | publishedAt = `2025-01-01T12:00:00+09:00` (C8) |

## status の意味

| 値          | 一覧での表示          | URL アクセス     |
| ----------- | --------------------- | ---------------- |
| `published` | ホーム / Index に出現 | 200              |
| `draft`     | 一覧に出現せず        | 開発時 200、本番 404 |
| `archived`  | Index に「アーカイブ」ラベル付きで残る | 200          |

「本番でのみ draft 非公開」は build 時に `import.meta.env.PROD` 等でフィルタする (Issue #0c)。

## 既存 16 記事の互換性検証

Issue #0c の AC として:

- [ ] `pnpm build` で 16 記事すべてが parse 成功
- [ ] スナップショット: 既存ホーム / 詳細ページの 1 記事サンプルが Visual Regression diff 0.1% 未満
- [ ] T1 テストが緑

## マイグレ補助 (任意)

`scripts/migratePost.ts` は **任意で使う補助スクリプト** とし、自動実行はしません。

```ts
// scripts/migratePost.ts (将来作成、Issue #0c の範疇外)
// 使い方: pnpm migrate-post datasources/20250101120000.md --status archived
//
// 既存記事に `## メタ` セクションを追記するためのヘルパ。
// - 既に `## メタ` がある場合は no-op
// - 投稿日時セクションから published_at を推定して書き込む
```

## 想定外データへの安全弁

- `## 本文` セクションが無い記事 → 警告のみ (build fail にしない、互換性優先)
- `# タイトル` (h1) が無い → ファイル名をフォールバックタイトルに
- 文字コード: UTF-8 with / without BOM の両方を許容
- 改行: LF / CRLF どちらでもパース可能
