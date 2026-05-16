# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 開発コマンド

### 基本コマンド

**重要**: `pnpm dev`を実行する前に、必ず`pnpm i`で最新の依存関係をインストールしてください。

- `pnpm i` - 依存関係のインストール（最初に必ず実行）
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
- **ルーティング**: React Router DOM（`src/main.tsx` で Routes を手動登録、`src/pages/` 配下にページコンポーネントを置く慣行）
- **コード品質**: Biome（高速なフォーマッタ・リンター）

### ディレクトリ構造

- `src/pages/` - ページコンポーネント配置（`src/main.tsx` の Routes に手動登録）
- `src/lib/` - ライブラリ・ユーティリティ関数
- `src/test/` - テストの共通セットアップ
- `styled-system/` - Panda CSS自動生成ファイル（編集不要）
- `datasources/` - Markdownファイル等のデータソース

> **既存 Issue / PR の用語解釈ガイド（Issue #542）**: 過去の Issue や PR の AC / 説明文に「ファイルベースルーティング」「vite-plugin-pages」と記載されているものは、いずれも本プロジェクトの実態である「`src/pages/` 配下にページコンポーネントを置き、`src/main.tsx` の `<Routes>` に手動登録する慣行」を指すものとして読み替えること。`vite-plugin-pages` 等の自動ルート生成方式の導入検討は #562 を参照。

#### 自動ルート生成方式（vite-plugin-pages 等）の導入検討結果（Issue #562, 2026-05-16）

**結論: 現状維持**（`src/main.tsx` での手動 `<Routes>` 登録を継続し、`vite-plugin-pages` / `@react-router/dev` の framework mode 等の自動ルート生成方式は導入しない）。再評価したくなった開発者向けに判断根拠を残す。

判断根拠:

- **ルート数が少なく自動化のメリットが薄い**: 現状のルートは 3 つ（`/` = IndexPage / `/posts/:timestamp` = PostPage / `/anchor` = AnchorPage）のみ。新規ページ追加コストは `src/main.tsx` への `<Route>` 1 行追加で済み、自動生成によるコスト削減幅は小さい
- **dynamic route は既存方式で十分**: `/posts/:timestamp` は React Router の `useParams` で対応済み（`src/pages/posts/Post.tsx`）。自動ルート生成方式が前提とするファイル名規約（`[slug].tsx` 等）に切り替える必要性はない
- **main.tsx 側に密結合した個別制御がある**: `src/main.tsx` のコメント (L10-24) にあるとおり、View Transitions Hero morph (Issue #397) の前提として IndexPage / PostPage を **eager import** に切り替えている。`vite-plugin-pages` の `importMode` オプション（filepath → `'sync' | 'async'` を返す関数）等で個別 eager 制御は可能だが、現状 3 ルートしかないため、自動生成 + `importMode` 関数で個別オーバーライドする構造より、手動 `<Routes>` で eager / lazy を直接書く方が**宣言の局所性**が高く読みやすい
- **外部依存追加の閾値が高い**: メモリ「外部ライブラリの追加は原則しない」の方針と整合させると、`vite-plugin-pages` 等の新規 devDependency 追加は inline 実装で代替できない場合に限られる。手動 Routes 登録で困っていない以上、追加根拠が立たない
- **SSR / SSG とは独立に判断可能**: 将来 SSG 化（Vite SSR / Astro 等への移行）を検討する際は、その移行 Issue でルート定義方式を含めて再設計するのが筋。SSG 化を見越して先回りで自動ルート生成方式を導入する必要はない

再評価のトリガー候補:

- ルート数が **10 以上** に増え、`main.tsx` の手動登録 (`<Route>` 行 + import 行) で 30 行を超え視認性が下がり始めた場合（数値は目安、`main.tsx` の見通しを最優先する指針）
- SSG / SSR への移行 Issue が起票される場合（観測可能な条件: Featured / 初回表示の Lighthouse スコア劣化が継続観測される / 3 件目以降の動的ページが追加される）。移行時にルート定義方式を含めて再設計する
- 上記タイミングで再評価する際は、`vite-plugin-pages` だけでなく **Tanstack Router** (file-based / type-safe routing) / **React Router v7 の `@react-router/fs-routes` (flatRoutes)** / **`import.meta.glob` を使った inline 自作の glob ベース生成** (= 外部依存追加を避ける現実的中間案) も比較対象に含める

### スタイリングパターン

Panda CSSを使用しているため、スタイルは以下のパターンで記述：

- `css()` 関数によるスタイルオブジェクト
- `styled` コンポーネント作成
- デザイントークンベースの一貫したスタイリング

#### cva (Panda recipe) 採用基準

スタイリングの**デフォルトは `css()`** で、`cva` recipe は限定的に先行導入した方式。新規コンポーネント追加時は原則 `css()` を使い、`cva` 化は以下の条件をすべて満たす場合に限る：

- Tripwire テストの**中核となる atom** であること
- variant / size の組み合わせが多く、recipe への集約で見通しが良くなること

現状 `cva` を使うのは `Button`（variant 3 × size 3）と `Link`（variant 4）のみ。PR #474 で Tripwire テストを Panda recipe + data-* 属性方式へ刷新した際、中核 atom 2 つに `cva` 導入を留めた。`cva` の適用範囲は段階的に拡大する方針で、variant 数だけを基準にはしない。

- **反例に注意**: `Typography`（Heading1/2/3、atom・variant 3）や `MetaInfo`（variant 4）は variant 数が多いが `css()` のスタイルオブジェクト lookup を使う。「variant が多い」だけでは `cva` 化の理由にならない

#### data-* 属性命名規約

Tripwire テスト用に吐く data-* 属性の命名は以下を指針とする。`data-token-*` / `data-divider` の命名揺れ整理は Issue #477 で進行中のため、確定済みの部分のみ記載する：

- **`data-token-*`**: Panda token 名を吐く（`accent.link` / `border.subtle` 等）。border 参照は `data-token-border` に統一する方向で、現状ほぼ全てのコンポーネントが従っている
- **`data-variant`**: 各コンポーネントの `variant` prop 値をそのまま反映する Tripwire 属性。コンポーネント横断で語彙が異なってよい（例: `BrandName` = 配置種、`Link` / `Button` = スタイル種）。prop 名と属性値が一致していれば一貫とみなす
- **`data-focus-ring`**: focus 状態（`default` / `on-accent` 等）の Tripwire 属性

> Issue #477 で、`data-token-*` を「Panda token 名のみを吐く」スキーマに統一し（CSS キーワード `inherit` 等は `data-color-inherit="true"` のような bool 属性へ分離）、`data-divider` を `data-token-border` へ統合する整理を進めている。確定後にこの規約へ反映する。

#### Panda `hash:true` の運用判断（2026-05-15 時点）

`panda.config.ts` の `hash:true` は**本番では無効（デフォルト）**で運用する。将来再評価する開発者向けの判断材料を残す。

- **Tripwire テストは `hash:true` 耐性あり**: PR #474 で導入した `data-*` 属性方式により、`hash:true` を一時有効化しても Tripwire テスト 647 件は全 pass（Issue #475 にて master `d609ef0` で実機検証、2026-05-15）。Issue #422 の構造的耐性は実機で担保された
- **bundle size はトレードオフ**: 生 CSS は `-25.6%` だが、hash 化で class 名のエントロピーが上がり gzip 圧縮率が低下するため、**gzip 後は `+5.8%`**。実環境は gzip 配信が標準なので、転送量で見るとほぼ等価
- **手書き hook class（`index-row-*` / `copy-btn` 等）は Panda hash 化対象外**: `hash:true` を有効化しても影響を受けない
- **再評価したい場合**: 別 Issue として切り出すこと
  - CI で `hash:true` 実機検証を回すための workflow は `.github/workflows/panda-hash-regression.yml`（Issue #496 で追加済み）
  - GitHub Actions の "Panda hash:true regression check" workflow から手動 (workflow_dispatch) で実行できる
  - 実行内容: `pnpm test:run` と `panda + tsc + vite build` を `hash: true` で 1 回ずつ実行し、Tripwire 耐性の regression を検知する

### 設定ファイル

- TypeScript: 厳格モード、ES2020ターゲット、バンドラー解決
- Biome: ダブルクォート、セミコロン必須、スペース2個インデント
- Vite: React JSX 変換プラグイン（`@vitejs/plugin-react`）と、Markdown コピー / API ミドルウェア登録 / 画像コピーを担う独自インラインプラグイン（`vite.config.ts` 内、現状名 `datasources-plugin`）を設定。自動ルート生成方式のプラグイン（`vite-plugin-pages` 等）は導入していない

## Gitブランチ運用ルール

### 基本原則

1. **masterへの直接コミット禁止**: masterブランチに直接コミットしてはならない
2. **ブランチ作成必須**: ファイルを操作する場合は必ずブランチを切ってから編集・コミットすること
3. **ブランチ名のプレフィックス**: ブランチ名には必ず以下のプレフィックスをつけること
   - `feature/` - 新機能開発
   - `fix/` - バグ修正
   - `chore/` - リファクタリング、ドキュメント更新など
   - `posts/${yyyymmdd}` - 今日の記事を書くとき
4. **英語でのブランチ名**: ブランチ名は英語で記述すること
5. **簡潔な命名**: ブランチ名は短く、わかりやすいものにする
6. **直接マージ禁止**: 開発ブランチを直接masterにマージしてはならない
7. **Pull Request必須**: マージは必ずGithubにpushして、Pull Requestを通して行うこと
8. **rebase禁止**: `git rebase`コマンドは使用しない。コンフリクト解決時は`git merge`を使用すること
9. **PRテンプレート使用**: Pull Requestの内容は`.github/pull_request_template.md`を元に作成すること
10. **既存ブランチへの無関係な変更禁止**: 既存のブランチ（特にdependabotなどの自動生成ブランチ）に、そのブランチの目的と無関係な変更を追加してはならない。異なる目的の変更は、必ずmasterから新しいブランチを切って別々のPRにすること

### ブランチ名の例

```bash
# 良い例
feature/user-authentication
fix/login-error
chore/update-dependencies
posts/20250101

# 悪い例
new-feature
修正
my-branch
posts/2025 # 年しか入っていない
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

### テスト方針（TDDとアサーション規約）

テストを書く際は以下の方針に従うこと。

#### TDDの姿勢（t-wada的TDD）

1. **Red-Green-Refactorを厳守する**: 失敗するテストを先に書き、最小実装で通し、リファクタリングで整える
2. **振る舞い単位でテストを書く**: 実装詳細ではなく、外部から観測可能な振る舞いを検証する
3. **一度に1つのテスト**: 同時に複数の振る舞いを扱わず、1サイクル1振る舞いに絞る
4. **テストリストを先に作る**: 着手前に検証したい振る舞いを列挙し、優先度順に1つずつ消化する
5. **仮実装→三角測量→実装の流れを許容する**: まずハードコードで通してから一般化する
6. **テストが仕様書として読めること**: `it` の文言を読めば仕様が分かる状態を保つ（既存「テストケース名のルール」参照）

TDDサイクルの詳細は `.claude/skills/tdd/SKILL.md` を参照。

#### アサーション・ランナー規約

本プロジェクトのテストは**Vitestに完全に寄せる**。以下を厳守すること。

1. **`node:assert` の使用禁止**: `node:assert`、`assert`、`node:assert/strict` からの import は一切行わない
2. **`expect` を使う**: アサーションは Vitest の `expect` を使用する
3. **import 元は `vitest` に統一**: `describe` / `it` / `expect` / `vi` / `beforeEach` / `afterEach` などは全て `vitest` から import する
4. **DOM系マッチャは `@testing-library/jest-dom` を利用**: `toBeInTheDocument` / `toBeDisabled` などはセットアップ済み（`src/test/` 参照）

```typescript
// 良い例: vitestに完全に寄せる
import { describe, expect, it, vi } from "vitest";

describe("add", () => {
  it("2つの数値を加算できる", () => {
    expect(add(1, 2)).toBe(3);
  });
});

// 悪い例: node:assertを使っている
import { strict as assert } from "node:assert";
import { describe, it } from "vitest";

describe("add", () => {
  it("2つの数値を加算できる", () => {
    assert.equal(add(1, 2), 3); // NG
  });
});
```

#### テスト配置とファイル命名

- テストファイルは対象ファイルと同階層の `__tests__/` 以下に置き、`*.test.ts` / `*.test.tsx` とする(既存ディレクトリ構成を踏襲)
- 共通セットアップは `src/test/` に集約する

### テストケース名のルール

テストケース名は以下のルールに従うこと：

1. **具体的な振る舞いを記述する**: 「正しく」「適切に」などの曖昧な表現は避ける
2. **可能性を示す**: 「〜できる」「〜になる」「〜として機能する」など、機能や能力を明確に示す
3. **期待される結果を明確にする**: 何が起きるべきかを具体的に記述する

#### 良い例

- ✅ `ボタンを非活性にできる`
- ✅ `クリックイベントが発火する`
- ✅ `デフォルトでprimaryスタイルになる`
- ✅ `外部リンクとして機能する`

#### 悪い例

- ❌ `disabled属性が正しく適用される` (何が正しいか不明)
- ❌ `正しく表示される` (正しさの基準が不明)
- ❌ `適切に処理される` (適切さの定義が不明)

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

### テストファイルでのモック

テストファイル（`*.test.ts`、`*.test.tsx`）では、モックの戻り値に`any`型の使用を許可します。
ただし、Biomeのエラーを回避するため、必ず以下のアノテーションコメントを追加すること：

```typescript
// 良い例
it("テストケース名", () => {
  const mockData = ["item1", "item2"];
  // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
  vi.mocked(someFunction).mockReturnValue(mockData as any);
});

// 悪い例（アノテーションなし）
it("テストケース名", () => {
  const mockData = ["item1", "item2"];
  vi.mocked(someFunction).mockReturnValue(mockData as any); // エラーになる
});
```

**重要**: この例外はテストファイルのモックに限定されます。プロダクションコードでは`any`型の使用は引き続き禁止です。
