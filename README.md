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
- **Vite 6** - 高速なビルドツール
- **Panda CSS** - 型安全なCSS-in-JS
- **React Router DOM** - クライアントサイドルーティング

### テスト
- **Vitest** - 高速なテストランナー
- **React Testing Library** - Reactコンポーネントのテスト
- **jsdom** - ブラウザ環境のシミュレーション

### コード品質
- **Biome** - リンター・フォーマッター（ESLint + Prettierの代替）
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

# プロダクションビルド
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

# Panda CSSコード生成
pnpm prepare
```

## プロジェクト構造

```
src/
├── lib/              # ユーティリティ関数
│   ├── __tests__/    # libのテスト
│   └── markdown.ts   # Markdown解析ロジック
├── pages/            # ページコンポーネント
│   ├── __tests__/    # pagesのテスト
│   ├── index.tsx     # トップページ（記事一覧）
│   └── posts/
│       └── [timestamp].tsx  # 記事詳細ページ
├── test/            # テスト共通設定
└── main.tsx         # アプリケーションエントリーポイント

datasources/         # Markdownファイル（記事データ）
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
- `src/pages/__tests__/` - Reactコンポーネントのテスト

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

## ライセンス

MIT