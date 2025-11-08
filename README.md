# Lazy Note

React 19 + TypeScript + Panda CSSを使用したシンプルなブログアプリケーションです。

## 機能

- **記事一覧表示**: Markdownファイルから記事を読み込み、一覧表示
- **記事詳細表示**: 個別記事の詳細ページ
- **ファイルベースルーティング**: React Router DOMによる動的ルーティング
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

# 開発サーバー起動
pnpm dev
```

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
│   │   ├── GradientBox.tsx
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
│   ├── design-tokens.ts  # デザイントークン定義
│   └── markdown.ts   # Markdown解析ロジック
├── pages/            # ファイルベースルーティング用
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
