# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発コマンド

### 基本コマンド

- `pnpm dev` - 開発サーバー起動（Panda CSS ウォッチモード付き）
- `pnpm build` - プロダクションビルド（Panda CSS生成 → TypeScript型チェック → Viteビルド）
- `pnpm test` - テストをウォッチモードで実行
- `pnpm test:run` - テストを1回実行
- `pnpm test:ui` - Vitest UIでテスト実行
- `pnpm fmt` - Biomeによるフォーマット実行
- `pnpm lint` - Biomeによるリント実行
- `pnpm prepare` - Panda CSS コード生成

## アーキテクチャ概要

### 技術スタック

- **フロントエンド**: React 19 + TypeScript
- **ビルドツール**: Vite 6
- **テスト**: Vitest + React Testing Library + jsdom
- **スタイリング**: Panda CSS（型安全なCSS-in-JS）
- **ルーティング**: React Router DOM + vite-plugin-pages（ファイルベースルーティング対応）
- **コード品質**: Biome（ESLint + Prettierの代替）

### ディレクトリ構造

- `src/pages/` - ファイルベースルーティング用（vite-plugin-pages設定済み）
- `src/lib/` - ライブラリ・ユーティリティ関数
- `src/test/` - テストの共通セットアップ
- `styled-system/` - Panda CSS自動生成ファイル（編集不要）
- `datasources/` - Markdownファイル等のデータソース

### スタイリングパターン

Panda CSSを使用しているため、スタイルは以下のパターンで記述：

- `css()` 関数によるスタイルオブジェクト
- `styled` コンポーネント作成
- デザイントークンベースの一貫したスタイリング

### 設定ファイル

- TypeScript: 厳格モード、ES2020ターゲット、バンドラー解決
- Biome: ダブルクォート、セミコロン必須、スペース2個インデント
- Vite: React + ファイルベースルーティングプラグイン設定済み

## Gitブランチ運用ルール

### 基本原則

1. **masterへの直接コミット禁止**: masterブランチに直接コミットしてはならない
2. **ブランチ作成必須**: ファイルを操作する場合は必ずブランチを切ってから編集・コミットすること
3. **ブランチ名のプレフィックス**: ブランチ名には必ず以下のプレフィックスをつけること
   - `feature/` - 新機能開発
   - `fix/` - バグ修正
   - `chore/` - リファクタリング、ドキュメント更新など
4. **英語でのブランチ名**: ブランチ名は英語で記述すること
5. **簡潔な命名**: ブランチ名は短く、わかりやすいものにする
6. **直接マージ禁止**: 開発ブランチを直接masterにマージしてはならない
7. **Pull Request必須**: マージは必ずGithubにpushして、Pull Requestを通して行うこと
8. **rebase禁止**: `git rebase`コマンドは使用しない。コンフリクト解決時は`git merge`を使用すること
9. **PRテンプレート使用**: Pull Requestの内容は`.github/pull_request_template.md`を元に作成すること

### ブランチ名の例

```bash
# 良い例
feature/user-authentication
fix/login-error
chore/update-dependencies

# 悪い例
new-feature
修正
my-branch
```

### コミットメッセージのルール

コミットする際は以下のルールに従うこと：

1. **ファイルごとの変更理由を記載**: 複数のファイルを変更した場合、各ファイルの変更理由を個別に記載する
2. **変更内容の明確化**: なぜその変更を行ったのか、目的と理由を明確に記述する

#### コミットメッセージの例

```bash
# 良い例（複数ファイルの変更）
feat: ユーザー認証機能の実装

- src/auth/login.ts: ログイン処理のロジックを実装
- src/auth/logout.ts: ログアウト処理とセッションクリアを追加
- src/components/LoginForm.tsx: ログインフォームUIコンポーネントを作成
- src/hooks/useAuth.ts: 認証状態管理のカスタムフックを実装

# 良い例（単一ファイルの変更）
fix: ログイン時のエラーハンドリングを修正

- src/auth/login.ts: APIエラー時の例外処理を追加し、ユーザーに適切なメッセージを表示するように修正
```

### コンフリクト解決の手順

masterとコンフリクトした場合の解決手順：

1. **masterブランチに切り替え**: `git checkout master`
2. **最新の変更を取得**: `git pull origin master`
3. **作業ブランチに戻る**: `git checkout [作業ブランチ名]`
4. **masterをmerge**: `git merge master`
5. **コンフリクト解決**: エディタでコンフリクトを手動解決
6. **解決済みファイルをステージング**: `git add [解決済みファイル]`
7. **マージコミット**: `git commit` (デフォルトメッセージを使用)
8. **変更をpush**: `git push origin [作業ブランチ名]`

**注意**: 絶対に`git rebase`は使用しないこと

## TypeScriptコーディングルールについて

必ず順守してください

### 変数と関数の命名

- **変数名と関数名**にはキャメルケース（`camelCase`）を使用します。

```typescript
// 良い例
const playerScore = 10;
const calculateTotal = () => { ... }

// 悪い例
const player_score = 10;
function CalculateTotal() { ... }
const CalculateTotal = () => { ... }
```

- **変数名**は名詞または名詞句を使用します。
- **関数名**は動詞または動詞句を使用します。

```typescript
// 良い例
const userCount = 10;
const getUserData = () => { ... }

// 悪い例
const getCount = 10;
function userData() { ... }
const userData = () => { ... }
```

- **ブール値**を表す変数は、`is`、`has`、`can`などの接頭辞を使用します。

```typescript
// 良い例
const isActive = true;
const hasPermission = false;
```

- **定数**（再代入されない値）については、変数名をキャメルケース（`camelCase`）または全て大文字のスネークケース（`UPPER_SNAKE_CASE`）で記述します。後者は通常、モジュールレベルで宣言された定数に使用されます。

```typescript
// どちらも良い例
const maxItems = 30;
const MAX_ITEMS = 30;
```

### クラス

- **クラス名**にはパスカルケース（`PascalCase`）を使用します。

```typescript
// 良い例
class UserProfile { ... }

// 悪い例
class userProfile { ... }
```

- **プライベートメンバー**および**プライベートメソッド**には先頭にアンダースコア（`_`）を付けることが推奨されます。

```typescript
class User {
  private _id: string;

  constructor(id: string) {
    this._id = id;
  }

  private _validateId() {
    // ...
  }
}
```

### インターフェースと型

- **インターフェース名**にはパスカルケース（`PascalCase`）を使用します。
- インターフェース名に `I` プレフィックスを付けるべきかどうかは議論の余地がありますが、一貫性を保つことが重要です。

```typescript
// どちらも受け入れられるスタイル
interface UserData { ... }
interface IUserData { ... }
```

- **型エイリアス**にもパスカルケース（`PascalCase`）を使用します。

```typescript
type UserId = string;
type RequestStatus = 'pending' | 'success' | 'error';
```

### 名前空間

- **名前空間**にはパスカルケース（`PascalCase`）を使用します。

```typescript
namespace Validation {
  // ...
}
```

### 列挙型

- **列挙型**にはパスカルケース（`PascalCase`）を使用します。
- **列挙型のメンバー**にもパスカルケース（`PascalCase`）を使用します。

```typescript
enum Direction {
  North,
  East,
  South,
  West
}
```

### null vs undefined

- `null`は意図的に値が存在しないことを表すために使用します。
- `undefined`は値がまだ割り当てられていないことを表すために使用します。
- 可能な限り、`undefined`の方を優先的に使用します。

```typescript
// 良い例 - 初期値がない場合
let userInput: string | undefined;

// 良い例 - 意図的に値が存在しないことを示す場合
const userNotFound = null;
```

### 書式設定

- インデントには**スペース2つ**を使用します（プロジェクト内で一貫していること）。
- 1行の最大文字数は**80〜120文字**に制限することが推奨されます。
- 関連するコードブロックの間には空行を1行挿入します。

```typescript
const calculateTotal = (items: Item[]): number => {
  if (items.length === 0) {
    return 0;
  }

  return items.reduce((total, item) => {
    return total + item.price;
  }, 0);
}
```

### 引用符

- 文字列には**ダブルクォート**（`"`）を一貫して使用します。
- テンプレートリテラルが必要な場合は**バッククォート**（`` ` ``）を使用します。

```typescript
const name = "John";

// テンプレートリテラル
const greeting = `Hello, ${name}!`;
```

### セミコロン

- 各ステートメントの終わりには**セミコロン**（`;`）を使用します。

```typescript
// 良い例
const x = 5;
const getData = () => { return x; }

// 悪い例
const x = 5
function getData() { return x }
const getData = () => { return x }
```

### 配列

- 配列の型を定義する場合は、`Array<T>`よりも`T[]`構文を優先します。

```typescript
// 良い例
const items: string[] = ['a', 'b', 'c'];

// 非推奨
const items: Array<string> = ['a', 'b', 'c'];
```

### オブジェクトリテラル

- オブジェクトリテラルのプロパティ名と値が同じ変数名の場合は、省略記法を使用します。

```typescript
// 良い例
const name = 'John';
const age = 30;
const user = { name, age };

// 冗長な例
const user = { name: name, age: age };
```

### プロパティ

- キャメルケースのプロパティにアクセスする場合は、ドット表記を使用します。
- 非キャメルケースのプロパティにアクセスする場合は、ブラケット表記を使用します。

```typescript
// 良い例
object.property = 5;
object['kebab-case-property'] = 5;
```

### コメント

- コメントは**日本語**で一貫して記述します。
- JSDocスタイルのコメントを使用して関数、クラス、インターフェースなどを文書化します。

```typescript
/**
 * ユーザーを表すインターフェース
 */
interface User {
  id: string;
  name: string;
  age: number;
}

/**
 * ユーザーデータをフェッチする関数
 * @param userId ユーザーID
 * @returns ユーザーオブジェクトを含むPromise
 */
async const fetchUser = (userId: string): Promise<User> => {
  // ...
}
```

### tsxでループ処理をする場合

- `Missing "key" prop for element in iterator` の警告を出さないために、keyを必ず設定すること
- その際にindexは使わないこと

```tsx
const items = ["apple", "banana", "orange"];

// 良い例
items.map((item) => <li key={item}>{item}</li>);

// 悪い例 indexをkeyに渡している
items.map((item, index) => <li key={index}>{item}</li>);
```

### その他のベストプラクティス

- `any`型の使用は禁止します。
- 型アサーションが必要な場合は、アサーション関数を使用します。
- テストコード内や単一のファイル内で明白な場合は`as`を利用します。

```typescript
// 優先されるアサーションの例
function isDuck(animal: Animal): asserts animal is Duck {
  if (walksLikeDuck(animal)) {
    if (quacksLikeDuck(animal)) {
      return;
    }
  }

  throw new Error("YOU ARE A FROG!!!");
}

// ここではquacks()は存在しない
// animal.quacks();

isDuck(animal);

animal.quacks();

// 良い例
const length = (value as string).length;

// 非推奨
const length = (<string>value).length;
```

- `readonly`修飾子を使用して、変更されないべきプロパティを示します。

```typescript
interface Config {
  readonly apiKey: string;
  readonly maxRetries: number;
}
```

- Nullish CoalescingやOptional Chainingなどの最新のTypeScript機能を活用します。

```typescript
// Nullish Coalescing
const value = someValue ?? defaultValue;

// Optional Chaining
const name = user?.profile?.name;
```
