# Lazy Note

React 19 + TypeScript + Panda CSSを使用したシンプルなブログアプリケーションです。

## 機能

- **記事一覧表示**: Markdownファイルから記事を読み込み、一覧表示
- **記事詳細表示**: 個別記事の詳細ページ
- **ルーティング**: React Router DOM（`src/main.tsx` の `<Routes>` に手動登録、`src/pages/` 配下にページコンポーネントを置く慣行。`vite-plugin-pages` 等の自動ルート生成方式は導入していない。判断根拠は [`CLAUDE.md`](./CLAUDE.md) の「自動ルート生成方式（vite-plugin-pages 等）の導入検討結果」を参照）
- **レスポンシブデザイン**: Panda CSSによる型安全なスタイリング

## 技術スタック

### フロントエンド

- **React 19** - UIライブラリ
- **TypeScript** - 型安全な開発
- **Vite 7** - 高速なビルドツール
- **Panda CSS** - 型安全なCSS-in-JS
- **React Router DOM** - クライアントサイドルーティング
- **Headless UI** - アクセシブルなUIコンポーネント
- **DOMPurify** - HTMLサニタイズライブラリ

### テスト

- **Vitest 4** - 高速なテストランナー
- **React Testing Library** - Reactコンポーネントのテスト
- **jsdom** - ブラウザ環境のシミュレーション

### コード品質

- **Biome** - 高速なリンター・フォーマッター
- **GitHub Actions** - CI/CDパイプライン

## セットアップ

### 前提条件

- Node.js 20以上
- pnpm

### インストール

```bash
# 依存関係のインストール
pnpm install

# git ネイティブ hooks を有効化 (初回 clone 時に一度だけ実行)
git config core.hooksPath .githooks

# 開発サーバー起動
pnpm dev
```

### git hooks の有効化 (必須)

本リポジトリは `.githooks/` に git ネイティブ hook を同梱しており、これらは clone しただけでは有効になりません。初回 setup 時に以下を実行して有効化してください:

```bash
git config core.hooksPath .githooks
```

提供している hook:

- `.githooks/pre-commit` — `master` / `main` ブランチへの直接 commit を拒否します
- `.githooks/commit-msg` — コミットメッセージ本文に `Co-Authored-By` 行が含まれていたら commit を拒否します

これらは [`CLAUDE.md`](./CLAUDE.md) のグローバルルール (「master への直接 commit 禁止」「コミットメッセージに Co-Authored-By を含めない」) を **git の動作上 bypass 不可能な層** で保証するためのものです (Issue #568 / Issue #592)。

`postinstall` での自動セットアップは採用していません。理由は以下:

- `git config core.hooksPath` はリポジトリローカルの設定を書き換える副作用を持ち、ユーザーが意図的に別の hooks path (例: husky / lefthook) を併用している場合に上書きしてしまう
- CI 環境 (GitHub Actions 等) では hooks は不要なため、`pnpm install --frozen-lockfile` 時に毎回実行される副作用は避けたい
- 一度実行すれば永続するため、README に書く方が運用上シンプル

### 利用可能なコマンド

```bash
# 開発サーバー起動（Panda CSS ウォッチモード付き）
pnpm dev

# プロダクションビルド（リント・テスト・型チェック・ビルドを順次実行）
pnpm build

# テスト実行（ウォッチモード）
pnpm test

# テスト実行（1回のみ）
pnpm test:run

# テストUI起動
pnpm test:ui

# リント実行
pnpm lint

# フォーマット実行
pnpm fmt

# 型チェック実行
pnpm type-check

# Panda CSSコード生成
pnpm prepare

# 新しい記事を作成
pnpm new-post
```

## プロジェクト構造

```
src/
├── api/              # APIミドルウェア
│   ├── __tests__/    # APIのテスト
│   ├── index.ts      # ミドルウェア登録
│   └── posts.ts      # 記事取得API
├── components/       # 共通コンポーネント
│   ├── atoms/        # 基本的なUIコンポーネント
│   │   ├── Button.tsx
│   │   ├── Link.tsx
│   │   └── Typography.tsx
│   ├── common/       # 汎用コンポーネント
│   │   ├── BrandName.tsx
│   │   ├── EmptyState.tsx
│   │   ├── LoadingSpinner.tsx
│   │   ├── MetaInfo.tsx
│   │   └── __tests__/    # commonコンポーネントのテスト
│   ├── layouts/      # レイアウトコンポーネント
│   │   ├── Footer.tsx
│   │   ├── Header.tsx
│   │   └── Layout.tsx
│   └── pages/        # ページ用コンポーネント
│       ├── HomePage.tsx
│       └── PostDetailPage.tsx
├── hooks/            # カスタムフック
│   ├── __tests__/    # hooksのテスト
│   ├── usePost.ts
│   └── usePosts.ts
├── lib/              # ユーティリティ関数
│   ├── __tests__/    # libのテスト
│   └── markdown.ts   # Markdown解析ロジック
├── pages/            # ページコンポーネント配置（src/main.tsx の Routes に手動登録）
│   ├── __tests__/    # pagesのテスト
│   ├── index.tsx     # トップページ（記事一覧）
│   └── posts/
│       └── Post.tsx  # 記事詳細ページ
├── test/            # テスト共通設定
└── main.tsx         # アプリケーションエントリーポイント

datasources/         # Markdownファイル（記事データ）
scripts/             # ユーティリティスクリプト
└── newPost.ts       # 新規記事作成スクリプト
styled-system/       # Panda CSS自動生成ファイル
```

## 記事の追加

`datasources/`ディレクトリに以下の形式でMarkdownファイルを追加してください：

**ファイル名**: `YYYYMMDDHHMMSS.md`（例: `20240101120000.md`）

**内容**:

```markdown
# 記事タイトル

## 投稿日時
- 2024-01-01 12:00

## 筆者名
- 筆者名

## 本文
記事の内容をここに書きます。

**太字**や*斜体*などのMarkdown記法が使用できます。
```

## テスト

テストファイルは各ディレクトリの`__tests__`フォルダに配置されています：

- `src/lib/__tests__/` - ユーティリティ関数のテスト
- `src/hooks/__tests__/` - カスタムフックのテスト
- `src/pages/__tests__/` - ページコンポーネントのテスト
- `src/components/common/__tests__/` - 共通コンポーネントのテスト

全てのテストケース名は日本語で記述されており、TDD（テスト駆動開発）の原則に従って開発されています。

## スタイリング

このプロジェクトではPanda CSSを使用しています：

- 型安全なスタイリング
- デザイントークンベースの一貫したデザイン
- `css()`関数とパターン関数による柔軟なスタイル定義

## CI/CD

GitHub Actionsを使用して以下の処理を自動化：

- リント・フォーマットチェック
- テスト実行
- 型チェック
- ビルド確認

## 設計ドキュメント

UI/UX フルリニューアル「Editorial Citrus」の設計ドキュメントは [`docs/rfc/editorial-citrus/`](./docs/rfc/editorial-citrus/README.md) に集約されています。

- [README (エントリポイント)](./docs/rfc/editorial-citrus/README.md)
- [Phase1 計画 (v2) ── 唯一の単一ソース](./docs/rfc/editorial-citrus/10-renewal-phase1-plan.md)
