#!/usr/bin/env node

/**
 * R-5 (Issue #393) で追加した、旧 5 段階パレット参照を CI で検出する Tripwire スクリプト。
 *
 * 検知パターン (R-2c で削除済みの旧 token を `src/**` で参照していないか確認):
 *   1. `bg.<digit>` (例: bg.0, bg.1, ..., bg.9)
 *   2. `fg.<digit>` (例: fg.0, fg.1, ..., fg.9)
 *   3. `token('colors.bg.<digit>')` / `token("colors.bg.<digit>")` (Panda token() 関数経由)
 *   4. `token('colors.fg.<digit>')` / `token("colors.fg.<digit>")`
 *   5. `var(--colors-bg-<digit>)` (Panda 生成 CSS 変数の直接参照)
 *   6. `var(--colors-fg-<digit>)`
 *   7. `token('colors.gruvbox.<...>')` (旧 Gruvbox 階層、R-2c で削除済み)
 *
 * 走査対象 (Issue #413 で拡張):
 *   - `<root>/src/**` の `.ts` / `.tsx` / `.css`
 *   - `<root>/panda.config.ts` (theme tokens 正本)
 *   - `<root>/scripts/**` の `.ts` (走査スクリプト自身は自己除外)
 *   - `<root>/e2e/**` の `.ts` / `.spec.ts`
 * 除外:
 *   - `__tests__/**` ディレクトリ (lint-tokens 自身を Tripwire させるテストや
 *     fixture でハードコードされた旧 token を検出してしまうのを避けるため、
 *     ディレクトリ単位で skip する)
 *   - `*.test.ts` / `*.test.tsx` (上記 `__tests__/**` 配下以外で配置されているテスト)
 *   - `scripts/lintTokens.ts` (自己除外: 本ファイルにパターンを文字列リテラルで保持しているため)
 *
 * 結果:
 *   - 0 件: exit 0 (CI 通過)
 *   - 1 件以上: exit 1 (CI ブロック)
 *   - 走査ファイル 0 件: exit 2 (構成不備 / 致命エラー、Issue #413 / DA 致命 2 対応)
 *
 * 設計メモ:
 * - 標準ライブラリ (`node:fs` / `node:path`) のみで実装し、追加依存は導入しない。
 * - サブディレクトリ走査は再帰的に実装する (glob ライブラリ不要)。
 * - パターンは Plain RegExp で書き、Panda の式リテラル展開や CSS 変数の
 *   双方を統一的に検出する。
 * - 行コメント (`//`) と複数行コメント (`/* ... *\/`) 内は走査対象から
 *   除外する (Issue #413)。コメント中の旧 token 言及 (旧→新マッピング表)
 *   による false positive を防ぐ。文字列リテラル中の `//` `/*` は
 *   コメント開始と見做さない。
 *
 * 拡張メモ:
 * - 追加の旧 token を検知したい場合は `LINT_PATTERNS` に正規表現を追加するだけで良い。
 * - false positive が出た場合は `EXCLUDED_FILE_SUFFIXES` 経由で除外する。
 */

import {
  readdirSync,
  readFileSync,
  realpathSync,
  type Stats,
  statSync,
} from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";

const PROJECT_ROOT = resolve(import.meta.dirname, "..");

/**
 * 走査対象パス (Issue #413 で複数 path 化)。
 * 既定は `src/`, `panda.config.ts`, `scripts/`, `e2e/` だが、テストから
 * `LINT_TOKENS_SRC_DIR` env で別パス (OS tmp 配下に作った擬似 src 等)
 * を単一指定できる。副作用として src/ 直下に一時ファイルを残置するリスクを
 * 排除する。
 *
 * env で指定された場合はそのパス 1 つに絞り込む (テスト時の独立性確保のため)。
 */
const TARGET_PATHS: readonly string[] = process.env.LINT_TOKENS_SRC_DIR
  ? [resolve(process.env.LINT_TOKENS_SRC_DIR)]
  : [
      join(PROJECT_ROOT, "src"),
      join(PROJECT_ROOT, "panda.config.ts"),
      join(PROJECT_ROOT, "scripts"),
      join(PROJECT_ROOT, "e2e"),
    ];

/** 走査対象拡張子 */
const TARGET_EXTENSIONS = new Set([".ts", ".tsx", ".css"]);

/**
 * 除外する suffix (検知対象から外したい末尾パターン)。
 * - 自テストの中で「文字列としてパターンを書いている」可能性があるため `.test.ts(x)` は除外する。
 *   `__tests__` 配下のテストは walkDirectory のディレクトリ単位 skip でも除外しているが、
 *   `__tests__` 外に配置された `*.test.ts(x)` を救うため suffix 除外も併用する。
 * - `scripts/lintTokens.ts` (本ファイル): パターン定義 (LINT_PATTERNS) や
 *   CI 失敗時のヒントメッセージで旧 token 名を文字列リテラルで参照しており、
 *   走査範囲拡大 (Issue #413) で自己検知してしまうため自身を除外する。
 */
const EXCLUDED_FILE_SUFFIXES = [
  ".test.ts",
  ".test.tsx",
  "scripts/lintTokens.ts",
];

/**
 * lint パターン定義。
 *
 * 各パターンには human-readable な name を付与しておき、検出時に
 * 「どの旧 token に違反したか」を分かりやすく表示できるようにする。
 *
 * scope:
 *   - "line" (既定): 行単位で走査する。コメント除去後の各行に対して RegExp 実行。
 *   - "file": ファイル全体を 1 つのテキストとして走査する。
 *     panda.config.ts のような複数行にまたがるオブジェクトリテラル
 *     (例: `bg: {\n  "0": { value: ... }\n}`) を検出するため。
 *     コメント除去はファイル単位で適用する。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
interface LintPattern {
  readonly name: string;
  readonly description: string;
  readonly pattern: RegExp;
  readonly scope?: "line" | "file";
}

/** @internal テスト専用 export. 本番コードから import しないこと */
const LINT_PATTERNS: readonly LintPattern[] = [
  {
    name: "old-bg-numeric",
    description: "旧 5 段階エイリアス bg.<digit> の参照",
    // \b で単語境界を要求。bg.0..bg.9 を検出。
    // class 名や変数名の中で `bg.0` がそのまま現れる panda の表記。
    pattern: /\bbg\.[0-9]\b/g,
  },
  {
    name: "old-fg-numeric",
    description: "旧 5 段階エイリアス fg.<digit> の参照",
    pattern: /\bfg\.[0-9]\b/g,
  },
  {
    name: "old-token-colors-bg-numeric",
    description: "Panda token() 経由の旧 colors.bg.<digit> 参照",
    // token('colors.bg.0') / token("colors.bg.0")
    pattern: /token\(['"]colors\.bg\.[0-9]['"]\)/g,
  },
  {
    name: "old-token-colors-fg-numeric",
    description: "Panda token() 経由の旧 colors.fg.<digit> 参照",
    pattern: /token\(['"]colors\.fg\.[0-9]['"]\)/g,
  },
  {
    name: "old-css-var-bg-numeric",
    description: "Panda 生成 CSS 変数 --colors-bg-<digit> の直接参照",
    pattern: /var\(--colors-bg-[0-9]\)/g,
  },
  {
    name: "old-css-var-fg-numeric",
    description: "Panda 生成 CSS 変数 --colors-fg-<digit> の直接参照",
    pattern: /var\(--colors-fg-[0-9]\)/g,
  },
  {
    name: "old-gruvbox-token",
    description: "旧 colors.gruvbox.* token の参照 (R-2c で削除済み)",
    // token('colors.gruvbox.bg-0') 形式。kebab-case や数字を含む値も拾う。
    pattern: /token\(['"]colors\.gruvbox\.[a-z0-9-]+['"]\)/g,
  },
  // ====================================================================
  // オブジェクトキー記法検知 (Issue #413 / DA 致命 1 対応)
  //
  // panda.config.ts のような theme 定義ファイルでは、旧 5 段階トークンが
  // `bg: { "0": { value: "..." } }` の形で再導入される可能性がある。
  // これは `bg.0` のドット記法とは別形式で、行単位 RegExp では捕まえにくい。
  //
  // 複数行にまたがるオブジェクトリテラルを検出するため scope: "file" を指定し、
  // ファイル全体に対して `[^}]*?` (非欲張り) で展開する。`/s` フラグで
  // 改行も `.` に含めるが、本パターンは `[^}]` を使っているため `s` フラグは
  // 厳密には不要。ただし将来 `.` を含むパターンが追加されたとき安全側に倒すため付与する。
  // ====================================================================
  {
    name: "old-bg-numeric-key",
    description:
      "オブジェクトキー記法 `bg: { '0': ... }` で旧 5 段階 token を再導入している可能性",
    // `bg: {` から閉じ `}` まで遡って数値キーを検出。`}` を含まない範囲で短く match。
    pattern: /\bbg\s*:\s*\{[^}]*?['"]?[0-9]['"]?\s*:/gs,
    scope: "file",
  },
  {
    name: "old-fg-numeric-key",
    description:
      "オブジェクトキー記法 `fg: { '0': ... }` で旧 5 段階 token を再導入している可能性",
    pattern: /\bfg\s*:\s*\{[^}]*?['"]?[0-9]['"]?\s*:/gs,
    scope: "file",
  },
  {
    name: "old-gruvbox-key",
    description:
      "オブジェクトキー記法 `gruvbox: {` で旧 Gruvbox パレットを再導入している可能性",
    pattern: /\bgruvbox\s*:\s*\{/g,
    scope: "file",
  },
] as const;

/** @internal テスト専用 export. 本番コードから import しないこと */
interface Violation {
  readonly file: string;
  readonly line: number;
  readonly column: number;
  readonly patternName: string;
  readonly description: string;
  readonly snippet: string;
}

/**
 * skip された対象 (パスと reason) を呼び出し側に通知するコールバック。
 *
 * - `path`: stat に失敗した絶対パス
 * - `reason`: 失敗の理由。Node の `NodeJS.ErrnoException.code`
 *   (`ENOENT` / `EACCES` / `EMFILE` 等) をそのまま渡す。code が取得
 *   できない例外は `"unknown"` にフォールバックする
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
type SkipCallback = (path: string, reason: string) => void;

/**
 * `statSync` を try/catch でラップし、対象が存在しない場合は undefined を返す。
 * `collectTargetFiles` / `walkDirectory` の cognitive complexity を抑え、
 * broken symlink 経路でも例外伝播を起こさないようにするための補助関数。
 *
 * CLAUDE.md「null vs undefined」方針に従い、戻り値型は `Stats | undefined` を
 * 採用する (DA レビュー Should Consider #1 / Issue #521 PR #619)。
 *
 * 例外ポリシー (Issue #621 / N2):
 *   - ENOENT (ファイル / シンボリックリンク先が存在しない) は静かに undefined を返す
 *   - **ENOENT 以外 (EACCES = 権限不足 / EMFILE = ファイルディスクリプタ枯渇 等)
 *     も同じく握り潰して undefined を返す**。これは Tripwire スクリプトの
 *     責務が「読める範囲のソースを走査して旧 token 検出する」ことであり、
 *     部分的な stat 失敗を理由に CI を落とすより、走査を継続して
 *     検出可能な違反を確実に拾うほうが価値が高いため
 *
 * 可視化 (Issue #637):
 *   攻撃者が permission を細工して特定ファイルを Tripwire 走査から外す
 *   経路への防御として、`onSkip` callback で skip 件数を呼び出し側に
 *   通知できる。呼び出し側 (`walkDirectory` / `main()`) は件数を集計し、
 *   `main()` 末尾で stderr に件数 / パス一覧を warn ログとして出力する
 *   ことで、CI ログから不審な skip 異常を一目で検知可能にする。
 *
 *   `onSkip` を渡さない呼び出しは従来通り「静かに skip」を維持する。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const tryStat = (
  target: string,
  onSkip?: SkipCallback,
): Stats | undefined => {
  try {
    return statSync(target);
  } catch (error) {
    if (onSkip) {
      const reason =
        error && typeof error === "object" && "code" in error
          ? String((error as NodeJS.ErrnoException).code ?? "unknown")
          : "unknown";
      onSkip(target, reason);
    }
    return undefined;
  }
};

/**
 * `realpathSync` を try/catch でラップし、失敗時は undefined を返す補助関数。
 *
 * 用途 (Issue #658 / 案 1):
 *   `walkDirectory` の symlink ループ防止 (`a -> b`, `b -> a` のような循環) に
 *   使う。訪問済みパス管理 (`Set<string>`) のキーは「実体パス」に正規化された
 *   ものを使う必要があり、`realpathSync` で symlink を辿り切って絶対パスに変換する。
 *
 * 例外ポリシー (`tryStat` と同じ理由で全例外を握り潰す):
 *   - ENOENT (broken symlink で実体が存在しない) → undefined を返し、呼び出し側
 *     で安全側 skip させる。Tripwire スクリプトの責務は「読める範囲を走査
 *     する」ことなので、realpath 失敗で CI を落とすより skip するほうが妥当
 *   - ELOOP (symlink ループ深度上限到達) / EACCES (権限不足) 等も同様に undefined
 *   - `onSkip` callback が渡されていれば errno code を reason として通知する
 *
 * CLAUDE.md「null vs undefined」方針に従い、戻り値型は `string | undefined`。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const tryRealpath = (
  target: string,
  onSkip?: SkipCallback,
): string | undefined => {
  try {
    return realpathSync(target);
  } catch (error) {
    if (onSkip) {
      const reason =
        error && typeof error === "object" && "code" in error
          ? String((error as NodeJS.ErrnoException).code ?? "unknown")
          : "unknown";
      onSkip(target, reason);
    }
    return undefined;
  }
};

/**
 * 走査対象ファイルとして受理可能か判定する。
 * - 拡張子が `TARGET_EXTENSIONS` に含まれること
 * - `EXCLUDED_FILE_SUFFIXES` のいずれにも該当しないこと
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const isAcceptableFile = (filePath: string): boolean => {
  if (!TARGET_EXTENSIONS.has(extname(filePath))) {
    return false;
  }
  return !EXCLUDED_FILE_SUFFIXES.some((suffix) => filePath.endsWith(suffix));
};

/**
 * ディレクトリ走査時に entry 名でスキップ判定する。
 * 隠しディレクトリ / `node_modules` / `__tests__` を弾く。
 *
 * `__tests__` は本ファイル冒頭 JSDoc で「除外対象」と明記済みだが、
 * 実装側で skip しないとテスト fixture (例: `__tests__/util.ts` 等の
 * 非 `.test.ts` ファイル) が `EXCLUDED_FILE_SUFFIXES` (suffix だけで
 * 判定) を素通りしてしまい、テストコード中の旧 token 言及で CI が
 * 落ちる潜在バグになる (Issue #413 / DA 重大 2 対応)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const shouldSkipEntry = (entry: string): boolean => {
  return (
    entry.startsWith(".") || entry === "node_modules" || entry === "__tests__"
  );
};

/**
 * 現在ディレクトリを `visited` に登録できるか試みる内部ヘルパー
 * (Issue #652 で `walkDirectoryRecursive` から抽出)。
 *
 * `current` 自身も symlink 経由で渡された可能性があるため `realpathSync` で
 * 実体パスに正規化し、既訪問なら ELOOP として skip 通知する。新規訪問なら
 * `visited` に追加して `true` を返す。
 *
 * 戻り値:
 *   - `true`: 新規訪問 (走査続行可)
 *   - `false`: realpath 失敗 or 既訪問 (走査打ち切り)
 *
 * @param visited **in-out**: 新規訪問なら現在ディレクトリ実体パスを追加する
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const tryMarkVisited = (
  current: string,
  onSkip: SkipCallback | undefined,
  visited: Set<string>,
): boolean => {
  const currentReal = tryRealpath(current, onSkip);
  if (currentReal === undefined) {
    return false;
  }
  if (visited.has(currentReal)) {
    // symlink ループ等で既訪問パスに再到達した場合は skip + 通知。
    onSkip?.(current, "ELOOP");
    return false;
  }
  visited.add(currentReal);
  return true;
};

/**
 * `walkDirectoryRecursive` のループ内で 1 エントリ分を評価する内部ヘルパー
 * (Issue #652 で `walkDirectoryRecursive` から抽出)。
 *
 * 役割分担:
 *   - skip 判定 (`shouldSkipEntry`) は呼び出し側が事前にチェック済み前提
 *   - 本関数は stat 取得 / ディレクトリ再帰 / ファイル accept 判定を担当
 *
 * ディレクトリの場合は `walkDirectoryRecursive` を再帰呼び出しする。ファイルの
 * 場合は `isAcceptableFile` で受理判定し合格なら `results` に push する。
 * stat 失敗エントリは静かにスキップする (`tryStat` 経由で onSkip 通知あり)。
 *
 * @param results **in-out**: 受理可能ファイルを末尾に push する
 * @param visited **in-out**: 再帰経路に持ち回す訪問済み実体パス Set
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const processWalkEntry = (
  fullPath: string,
  results: string[],
  onSkip: SkipCallback | undefined,
  visited: Set<string>,
): void => {
  const entryStats = tryStat(fullPath, onSkip);
  if (!entryStats) {
    return;
  }
  if (entryStats.isDirectory()) {
    walkDirectoryRecursive(fullPath, results, onSkip, visited);
    return;
  }
  if (entryStats.isFile() && isAcceptableFile(fullPath)) {
    results.push(fullPath);
  }
};

/**
 * ディレクトリを再帰走査し、受理可能ファイルを `results` に追記する内部ヘルパー
 * (Issue #722 で `walkDirectory` から分割)。
 *
 * `statSync` を直接呼ぶと broken symlink 等で throw する潜在問題があるため、
 * `tryStat` 経由で取得し、stat 失敗エントリは静かにスキップする
 * (Issue #621 / M1)。
 *
 * symlink ループ防止 (Issue #658):
 *   `a -> b`, `b -> a` のような symlink 循環下では `tryStat` が Stats を返す
 *   ため `isDirectory()` 判定後に再帰呼び出しで無限ループに陥る潜在リスクが
 *   ある。そこで `realpathSync` で正規化したディレクトリ実体パスを
 *   `visited: Set<string>` に記録し、既訪問なら skip する (案 1)。
 *
 *   - `visited` のスコープは public 入口 `walkDirectory` 呼び出し単位
 *     (= `collectTargetFiles` 1 回分)。呼び出し間で再利用しないことで、
 *     `TARGET_PATHS` の各ターゲットが独立した走査を行えるようにする
 *     (例: `src/` と `scripts/` の両方が `tmp/cache` を symlink で指していても
 *     両方を走査対象にする)
 *   - `realpathSync` が失敗 (broken symlink / ELOOP 等) した場合は安全側 skip
 *     + `onSkip` 通知 (`tryRealpath` 経由)
 *   - ファイルは再帰呼び出しを伴わないため visited 記録対象外 (= ループ
 *     リスクなし)。記録すると同一実体ファイルを複数の symlink 経由で参照
 *     しているケースで片方が落ちる副作用が出るため、ディレクトリのみ管理する
 *     (Issue #703 Minor 3 で「重複 scan 容認」をテスト化済み)
 *
 * 設計判断 (Issue #722 / 案 B):
 *   PR #703 (Issue #658) で `walkDirectory(current, results, onSkip?, visited?)`
 *   と visited をオプショナルで導入したが、DA レビュー M-1 で「外部呼び出し時に
 *   visited を渡し忘れる余地が残る」と指摘された。本 PR で **public 入口
 *   `walkDirectory` (visited を意識しない) と internal 再帰 `walkDirectoryRecursive`
 *   (visited 必須) の 2 関数に分割**することで、再帰経路では visited 漏れを
 *   型レベルで防止し、外部呼び出し側は visited を意識せず使えるようにした
 *   (= API 表面の明確化)。
 *
 * Biome 厳格化耐性メモ (Issue #652 / PR #623 follow-up):
 *   本関数は `maxAllowedComplexity:8` 厳格化条件下でも違反 0 になるよう、
 *   「visited 登録の試行」を `tryMarkVisited` ヘルパーへ、「1 エントリ分の
 *   stat / 再帰 / accept 判定」を `processWalkEntry` ヘルパーへ抽出している。
 *   関数本体はこの 2 ヘルパー呼び出しと shouldSkipEntry の早期 continue だけに
 *   絞られるため、各分岐が分散して complexity 12 → 4 (測定値) に低減する。
 *   public API シグネチャ (`walkDirectoryRecursive(current, results, onSkip, visited)`)
 *   は不変。再帰経路 / visited 取り回し / symlink ループ防止の振る舞いも全て
 *   既存 `lintTokens.test.ts` で固定済み。
 *
 * @param results **in-out**: 検出した受理可能ファイルのパスを末尾に push する
 *   (Issue #621 / N1)
 * @param onSkip 省略可。stat / realpath 失敗 / symlink ループで skip した場合に
 *   呼ばれるコールバック (Issue #637 / Issue #658)。`main()` が件数集計用に渡す
 * @param visited **必須**: 訪問済みディレクトリ実体パスの `Set` (Issue #658)。
 *   再帰経路で visited 漏れを防ぐため public 入口 `walkDirectory` 側で新規生成し、
 *   この内部関数では受け取りを必須化する (Issue #722 / 案 B)
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const walkDirectoryRecursive = (
  current: string,
  results: string[],
  onSkip: SkipCallback | undefined,
  visited: Set<string>,
): void => {
  if (!tryMarkVisited(current, onSkip, visited)) {
    return;
  }

  const entries = readdirSync(current);
  for (const entry of entries) {
    if (shouldSkipEntry(entry)) {
      continue;
    }
    processWalkEntry(join(current, entry), results, onSkip, visited);
  }
};

/**
 * ディレクトリを再帰走査し、受理可能ファイルを `results` に追記する public 入口
 * (Issue #722 で `walkDirectoryRecursive` から分離)。
 *
 * 内部で visited Set を新規生成し、再帰呼び出しは `walkDirectoryRecursive` に
 * 委譲する。**外部呼び出し側 (= `collectTargetFiles` / テスト) は visited を
 * 意識せず使える**。再帰経路で visited を取り回す責務は internal 側に閉じ込めて
 * あるため、visited 渡し忘れによる無限ループ regression を構造的に防ぐ
 * (DA レビュー M-1 / Issue #722 / 案 B 採用)。
 *
 * visited のスコープは「この `walkDirectory` 呼び出し単位」で、呼び出し間で
 * 再利用しない (= 同一実体を指す独立ターゲット (`src/` と symlink された別 root)
 * は別個に走査される)。挙動詳細は `walkDirectoryRecursive` JSDoc を参照。
 *
 * @param results **in-out**: 検出した受理可能ファイルのパスを末尾に push する
 *   (Issue #621 / N1)
 * @param onSkip 省略可。stat / realpath 失敗 / symlink ループで skip した場合に
 *   呼ばれるコールバック (Issue #637 / Issue #658)
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const walkDirectory = (
  target: string,
  results: string[],
  onSkip?: SkipCallback,
): void => {
  walkDirectoryRecursive(target, results, onSkip, new Set<string>());
};

/**
 * 指定パスを走査し、対象ファイルのパスリストを返す (Issue #413)。
 *
 * - 単一ファイル指定 (panda.config.ts 等) なら拡張子と除外 suffix を確認した
 *   上でそのファイルを返す。
 * - ディレクトリ指定なら再帰的に走査する。
 * - `node_modules` / 隠しディレクトリ (`.` から始まる) はスキップする
 *   (scripts/ から実行する都合、`src/` 配下に限ればこれらは出てこないが
 *   将来 PROJECT_ROOT 走査に変えたとき耐えるためガードを入れておく)。
 * - 走査対象が存在しない場合は空配列を返す (例: e2e/ 未配置構成でも壊れない)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const collectTargetFiles = (
  target: string,
  onSkip?: SkipCallback,
): string[] => {
  const results: string[] = [];
  const stats = tryStat(target, onSkip);
  if (!stats) {
    return results;
  }

  // 単一ファイル指定 (panda.config.ts 等) のショートカット。
  if (stats.isFile()) {
    if (isAcceptableFile(target)) {
      results.push(target);
    }
    return results;
  }

  if (!stats.isDirectory()) {
    return results;
  }

  // Issue #722 で `walkDirectory` を「public 入口 (visited を意識しない 3 引数版)」と
  // 「internal 再帰 `walkDirectoryRecursive` (visited 必須)」の 2 関数に分割した。
  // `collectTargetFiles` 側は public 入口のみを呼べばよく、visited Set の生成 /
  // 取り回し責務は `walkDirectory` 内に閉じ込められている (= 呼び出し側で
  // visited 漏れによる無限ループ regression が起きない構造)。
  walkDirectory(target, results, onSkip);
  return results;
};

/**
 * 1 行から行コメント (`//`) と複数行コメント (`/* ... *\/`) を除去する
 * 簡易ストリッパー (Issue #413)。
 *
 * - state machine で「コメントブロック内かどうか」を保持する必要があるため
 *   呼び出し側でブロック状態を渡してもらい、新しい状態と検査用文字列を返す。
 * - 文字列リテラル (`"..."` / `'...'` / `` `...` ``) 内の `//` や `/*` は
 *   コメント開始と見做さず、そのまま検査対象に残す (旧 token を文字列リテラル
 *   として記述したケースも検知したいため)。
 * - column 位置を維持するため、コメント領域は同じ長さの空白で置換する。
 *
 * 戻り値:
 *   - sanitized: 検査対象として残す部分 (コメント領域は空白に置換済み)。
 *   - inBlockComment: 行末で複数行コメントが継続中かどうか。
 */
interface CommentStripState {
  readonly inBlockComment: boolean;
}

interface CommentStripResult {
  readonly sanitized: string;
  readonly inBlockComment: boolean;
}

/**
 * `stripComments` の状態機械内部状態。
 * 状態ごとのハンドラ間で受け渡される、行内の文字種コンテキスト。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
interface ScanState {
  inBlockComment: boolean;
  inSingle: boolean;
  inDouble: boolean;
  inBacktick: boolean;
}

/**
 * 1 文字処理後の進行情報。
 * `advance` は追加で消費すべきインデックス数 (0 もしくは 1)。
 * `terminated` が true の場合、その時点で行の処理を打ち切る (行コメント検出時)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
interface StepResult {
  readonly advance: number;
  readonly terminated: boolean;
}

const NO_ADVANCE: StepResult = { advance: 0, terminated: false };

/**
 * ハンドラ関数群 (`handleBlockComment` / `handleStringLiteral` /
 * `handleDefault`) の `out: string[]` 引数は **in-out 引数 (副作用パターン)**
 * として運用する (Issue #621 / N1)。
 *
 * - 呼び出し側 (`stripComments`) が文字単位で push し、最後に `join("")`
 *   する形で sanitized テキストを構築する。push の累積が結果なので、
 *   ハンドラは `out` の所有権を共有し直接 mutate する
 * - 関数の戻り値 (`StepResult`) は **位置進行情報** (`advance` /
 *   `terminated`) のみを返し、テキストそのものは `out` 経由で持ち回る
 *   ことで join 1 回分の文字列連結に抑え、`String += String` の二乗
 *   アロケーションを回避する
 * - 同様に `state: ScanState` も in-out 引数として mutate する。
 *   呼び出し側に状態遷移を伝えるための共有参照
 */

/**
 * ブロックコメント中の 1 文字を処理する。
 * `* /` を検出したら終端、それ以外は空白に置換して維持する。
 *
 * @param out **in-out**: 処理後の sanitized 文字を末尾に push する (push only)
 * @param state **in-out**: `inBlockComment` を必要に応じて mutate する
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const handleBlockComment = (
  ch: string,
  next: string,
  out: string[],
  state: ScanState,
): StepResult => {
  if (ch === "*" && next === "/") {
    state.inBlockComment = false;
    out.push(" ", " ");
    return { advance: 1, terminated: false };
  }
  out.push(" ");
  return NO_ADVANCE;
};

/**
 * 文字列リテラルの種類 (シングル / ダブル / バッククォート) と、
 * 対応する `ScanState` のフラグキーを束ねる対応表。
 *
 * `handleStringLiteral` から閉じクォート文字を直接フィールドキーへ変換できる
 * ようにし、呼び出し側で都度 `closer` クロージャを生成していた micro-allocation
 * を排除する (Issue #621 / M2, M3)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
type QuoteChar = "'" | '"' | "`";
type QuoteStateField = "inSingle" | "inDouble" | "inBacktick";

const QUOTE_FIELD: Readonly<Record<QuoteChar, QuoteStateField>> = {
  "'": "inSingle",
  '"': "inDouble",
  "`": "inBacktick",
};

/**
 * 文字列リテラル内 (シングル / ダブル / バッククォート) の 1 文字を処理する。
 * - エスケープシーケンス (`\\x`) は次の文字も維持する。
 * - 終端クォートを検出したら `QUOTE_FIELD` で引いた `ScanState` フラグを下ろす。
 *
 * `quote` 引数のみで文字列リテラルの種類とフラグキーの双方を表現する
 * (旧 `closer` クロージャの責務を `QUOTE_FIELD` 表に集約)。
 *
 * @param out **in-out**: sanitized 文字を末尾に push する (push only)
 * @param state **in-out**: 終端クォート検出時に対応する `in*` フラグを下ろす
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const handleStringLiteral = (
  ch: string,
  next: string,
  out: string[],
  state: ScanState,
  quote: QuoteChar,
): StepResult => {
  out.push(ch);
  if (ch === "\\" && next !== "") {
    out.push(next);
    return { advance: 1, terminated: false };
  }
  if (ch === quote) {
    state[QUOTE_FIELD[quote]] = false;
  }
  return NO_ADVANCE;
};

/**
 * `ch` が文字列リテラル開始クォートかを判定する type predicate。
 * `QUOTE_FIELD` のキー集合と一致させることで、`handleDefault` から
 * クォート種別ごとに 3 つに分かれていた `if` 分岐を 1 つに集約できる
 * (Issue #652)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const isQuoteChar = (ch: string): ch is QuoteChar => {
  return ch === "'" || ch === '"' || ch === "`";
};

/**
 * 通常コード領域で文字列リテラル開始クォートに遭遇した場合の状態遷移を行う
 * 内部ヘルパー (Issue #652 で `handleDefault` から抽出)。
 *
 * `QUOTE_FIELD` 表から該当フラグキーを引いて `state` の対応フラグを立て、
 * クォート文字をそのまま `out` に push する。クォートでなければ何もせず
 * `false` を返し呼び出し側に処理続行を任せる。
 *
 * @param out **in-out**: クォート文字を末尾に push する (push only)
 * @param state **in-out**: 対応する `in*` フラグを true に mutate する
 * @returns クォートを検出して処理した場合 true (= `handleDefault` 側で即 return)
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const tryEnterStringLiteral = (
  ch: string,
  out: string[],
  state: ScanState,
): boolean => {
  if (!isQuoteChar(ch)) {
    return false;
  }
  state[QUOTE_FIELD[ch]] = true;
  out.push(ch);
  return true;
};

/**
 * 通常コード領域での 1 文字を処理する。
 * - 文字列開始クォートを検出したら該当フラグを立てる (`tryEnterStringLiteral`)。
 * - 行コメント `//` を検出した場合は行末まで空白で埋めて打ち切り。
 * - ブロックコメント開始 `/ *` を検出したら inBlockComment を立てる。
 * - それ以外は文字をそのまま追記する。
 *
 * Biome 厳格化耐性メモ (Issue #652 / PR #623 follow-up):
 *   本関数は `maxAllowedComplexity:8` 厳格化条件下でも違反 0 になるよう、
 *   クォート種別ごとに 3 分岐していたシングル / ダブル / バッククォート開始処理を
 *   `tryEnterStringLiteral` ヘルパーへ集約している。これで関数本体の分岐は
 *   「クォート / 行コメント / ブロックコメント / それ以外」の 4 系統に減り
 *   complexity 9 → 8 以下に低減する。挙動 (state 遷移 / out への push 内容 /
 *   StepResult) は不変、既存 `lintTokens.test.ts` のコメント除去テストで固定済み。
 *
 * @param out **in-out**: sanitized 文字 / 空白を末尾に push する (push only)
 * @param state **in-out**: 検出した状態遷移に応じて `in*` フラグを mutate する
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const handleDefault = (
  ch: string,
  next: string,
  out: string[],
  state: ScanState,
  remainingLength: number,
): StepResult => {
  if (tryEnterStringLiteral(ch, out, state)) {
    return NO_ADVANCE;
  }
  if (ch === "/" && next === "/") {
    for (let j = 0; j < remainingLength; j += 1) {
      out.push(" ");
    }
    return { advance: 0, terminated: true };
  }
  if (ch === "/" && next === "*") {
    state.inBlockComment = true;
    out.push(" ", " ");
    return { advance: 1, terminated: false };
  }
  out.push(ch);
  return NO_ADVANCE;
};

/**
 * 現在の `ScanState` に応じて適切なハンドラを呼び分ける。
 * `stripComments` の主ループを薄く保つためのディスパッチ層。
 *
 * @param out **in-out**: 配下ハンドラへそのまま渡される push only バッファ
 * @param state **in-out**: 配下ハンドラへそのまま渡される共有状態
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const processChar = (
  ch: string,
  next: string,
  remainingLength: number,
  out: string[],
  state: ScanState,
): StepResult => {
  if (state.inBlockComment) {
    return handleBlockComment(ch, next, out, state);
  }
  if (state.inSingle) {
    return handleStringLiteral(ch, next, out, state, "'");
  }
  if (state.inDouble) {
    return handleStringLiteral(ch, next, out, state, '"');
  }
  if (state.inBacktick) {
    return handleStringLiteral(ch, next, out, state, "`");
  }
  return handleDefault(ch, next, out, state, remainingLength);
};

/** @internal テスト専用 export. 本番コードから import しないこと */
const stripComments = (
  line: string,
  state: CommentStripState,
): CommentStripResult => {
  const scanState: ScanState = {
    inBlockComment: state.inBlockComment,
    inSingle: false,
    inDouble: false,
    inBacktick: false,
  };
  const out: string[] = [];

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i] ?? "";
    const next = i + 1 < line.length ? (line[i + 1] ?? "") : "";
    const step = processChar(ch, next, line.length - i, out, scanState);
    if (step.terminated) {
      return { sanitized: out.join(""), inBlockComment: false };
    }
    i += step.advance;
  }

  return { sanitized: out.join(""), inBlockComment: scanState.inBlockComment };
};

/**
 * ファイル全体に対してコメント除去を適用した結果と、
 * 各行の元テキスト / 行頭オフセットを返すユーティリティ。
 *
 * `scope: "file"` パターンの match.index (ファイル全体オフセット) から
 * 行番号 / カラム位置 / 元行 snippet を逆引きするのに使う。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
interface SanitizedFile {
  /** コメント領域を空白に置換したファイル全体テキスト */
  readonly sanitized: string;
  /** 各行の元テキスト (snippet 表示用) */
  readonly originalLines: string[];
  /** 各行の先頭 offset (sanitized 上の絶対位置) */
  readonly lineStartOffsets: number[];
}

/** @internal テスト専用 export. 本番コードから import しないこと */
const sanitizeFile = (content: string): SanitizedFile => {
  const lines = content.split(/\r?\n/);
  const sanitizedLines: string[] = [];
  const lineStartOffsets: number[] = [];
  let cursor = 0;
  let stripState: CommentStripState = { inBlockComment: false };

  for (const line of lines) {
    lineStartOffsets.push(cursor);
    const { sanitized, inBlockComment } = stripComments(line, stripState);
    stripState = { inBlockComment };
    sanitizedLines.push(sanitized);
    // sanitizedLines は join("\n") で連結する想定。改行 1 文字ぶん cursor を進める。
    cursor += sanitized.length + 1;
  }

  return {
    sanitized: sanitizedLines.join("\n"),
    originalLines: lines,
    lineStartOffsets,
  };
};

/**
 * sanitized 全体オフセットから「何行目の何カラム目か」を逆引きする。
 * lineStartOffsets は昇順なので二分探索で O(log n)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const offsetToLineColumn = (
  offset: number,
  lineStartOffsets: readonly number[],
): { readonly line: number; readonly column: number } => {
  let lo = 0;
  let hi = lineStartOffsets.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    const start = lineStartOffsets[mid];
    if (start === undefined) {
      // 配列範囲外を二分探索で踏むことは無いはずだが、型ガードとして扱う。
      hi = mid - 1;
      continue;
    }
    if (start <= offset) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  const lineIndex = lo;
  const start = lineStartOffsets[lineIndex] ?? 0;
  return { line: lineIndex + 1, column: offset - start + 1 };
};

/**
 * regex.exec を反復し、ヒットごとに `onMatch` を呼ぶ汎用イテレータ。
 * 0 幅マッチによる無限ループを避けるため、lastIndex を強制前進させる。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const iterateMatches = (
  pattern: RegExp,
  haystack: string,
  onMatch: (match: RegExpExecArray) => void,
): void => {
  const regex = new RegExp(pattern.source, pattern.flags);
  let match: RegExpExecArray | null = regex.exec(haystack);
  while (match !== null) {
    onMatch(match);
    if (match.index === regex.lastIndex) {
      regex.lastIndex += 1;
    }
    match = regex.exec(haystack);
  }
};

/**
 * ファイル全体スコープでパターン照合する (複数行にまたがるパターン用)。
 * panda.config.ts の `bg: { "0": ... }` のような複数行構造を検出するために使う。
 *
 * @param violations **in-out**: 検出した違反を末尾に push する (Issue #621 / N1)
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const scanFileScope = (
  filePath: string,
  pattern: LintPattern,
  fileScope: SanitizedFile,
  violations: Violation[],
): void => {
  const { sanitized, originalLines, lineStartOffsets } = fileScope;
  iterateMatches(pattern.pattern, sanitized, (match) => {
    const { line, column } = offsetToLineColumn(match.index, lineStartOffsets);
    const snippetLine = originalLines[line - 1] ?? "";
    violations.push({
      file: filePath,
      line,
      column,
      patternName: pattern.name,
      description: pattern.description,
      snippet: snippetLine.trim(),
    });
  });
};

/**
 * sanitized テキスト上で `lineIndex` 行目に対応する範囲を切り出す。
 * `scanLineScope` の内部ヘルパー。
 *
 * `Math.max(start, nextStart - 1)` のガード意図 (Issue #621 / N3):
 *   通常 `nextStart` は次行先頭 (改行直後) を指すため `nextStart - 1` は
 *   現行末の改行位置となり、改行 1 文字を除いて返せる。
 *   ただし `sanitized` が空 (`""`) の場合や、`lineStartOffsets` が
 *   `[0]` 1 件だけのとき末尾行に対して fallback `sanitized.length + 1`
 *   が走り、`nextStart - 1 = sanitized.length`、`start = 0` で
 *   通常は問題ない。一方、空文字列で `lineStartOffsets = [0]` の場合
 *   `nextStart - 1 = 0` で start と等しく、`slice(0, 0) = ""` を返す。
 *   `Math.max` は `start > nextStart - 1` という想定外の崩れ
 *   (将来 `lineStartOffsets` 計算ロジックを書き換えた際の安全網) に対して
 *   slice の end が start を下回って空でない結果を返してしまうケースを
 *   防ぐためのディフェンシブガードである。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const extractSanitizedLine = (
  sanitized: string,
  lineStartOffsets: readonly number[],
  lineIndex: number,
): string => {
  const start = lineStartOffsets[lineIndex] ?? 0;
  const nextStart = lineStartOffsets[lineIndex + 1] ?? sanitized.length + 1;
  return sanitized.slice(start, Math.max(start, nextStart - 1));
};

/**
 * 行スコープでパターン照合する (既定動作)。
 * 行ごとに sanitized 行を取り出して RegExp を実行し、行 / カラムを直接記録する。
 *
 * @param violations **in-out**: 検出した違反を末尾に push する (Issue #621 / N1)
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const scanLineScope = (
  filePath: string,
  pattern: LintPattern,
  fileScope: SanitizedFile,
  violations: Violation[],
): void => {
  const { sanitized, originalLines, lineStartOffsets } = fileScope;
  for (let lineIndex = 0; lineIndex < originalLines.length; lineIndex += 1) {
    const line = originalLines[lineIndex];
    if (line === undefined) {
      continue;
    }
    const sanitizedLine = extractSanitizedLine(
      sanitized,
      lineStartOffsets,
      lineIndex,
    );
    iterateMatches(pattern.pattern, sanitizedLine, (match) => {
      violations.push({
        file: filePath,
        line: lineIndex + 1,
        column: match.index + 1,
        patternName: pattern.name,
        description: pattern.description,
        // 元のコメント込みの行を見せたほうが文脈が分かるので元行を表示する。
        snippet: line.trim(),
      });
    });
  }
};

/**
 * 1 ファイル分の検査。
 *
 * - 行単位 (`scope: "line"` 既定) で検出位置 (line / column) を出すと
 *   CI ログでジャンプしやすい。
 * - 複数行 (`scope: "file"`) パターンはファイル全体のテキストに RegExp を実行し、
 *   match.index から逆引きで行 / カラムを出す。
 * - 大文字小文字は区別する (token 名は確定的にケースが決まっている)。
 * - 行コメント / ブロックコメント内は検査対象から除外する (Issue #413)。
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const scanFile = (
  filePath: string,
  patterns: readonly LintPattern[],
): Violation[] => {
  const content = readFileSync(filePath, "utf8");
  const violations: Violation[] = [];
  const fileScope = sanitizeFile(content);

  for (const pattern of patterns) {
    if (pattern.scope === "file") {
      scanFileScope(filePath, pattern, fileScope, violations);
    } else {
      scanLineScope(filePath, pattern, fileScope, violations);
    }
  }

  return violations;
};

const formatViolation = (v: Violation): string => {
  const relPath = relative(PROJECT_ROOT, v.file);
  return `${relPath}:${v.line}:${v.column}  [${v.patternName}] ${v.description}\n    ${v.snippet}`;
};

/** @internal テスト専用 export. 本番コードから import しないこと */
interface SkipRecord {
  readonly path: string;
  readonly reason: string;
}

/**
 * skip 集計結果を stderr に warn ログとして出力する (Issue #637)。
 *
 * - 件数 0 の場合は何も出力しない (通常 CI ログのノイズを増やさない)
 * - 件数 > 0 の場合は件数とパス一覧 / reason を 1 行ずつ出力する
 *   ことで、CI ログで grep / scroll 時に skip 異常が一目で分かるようにする
 *
 * @internal テスト専用 export. 本番コードから import しないこと
 */
const reportSkippedTargets = (skipped: readonly SkipRecord[]): void => {
  if (skipped.length === 0) {
    return;
  }
  console.warn(
    `lint:tokens WARN: ${skipped.length} path(s) skipped during stat. ` +
      "permission tampering を疑う場合は以下を確認してください:",
  );
  for (const record of skipped) {
    const relPath = relative(PROJECT_ROOT, record.path);
    console.warn(`  - [${record.reason}] ${relPath}`);
  }
};

const main = (): void => {
  const files: string[] = [];
  const skipped: SkipRecord[] = [];
  const onSkip: SkipCallback = (path, reason) => {
    skipped.push({ path, reason });
  };
  for (const target of TARGET_PATHS) {
    files.push(...collectTargetFiles(target, onSkip));
  }

  // skip 件数の可視化 (Issue #637)。
  // 0 files ガードや旧 token 検出より先に出すことで、構成不備で exit 2/1
  // した場合でも skip 異常が CI ログに残るようにする。
  reportSkippedTargets(skipped);

  // 0 files scanned ガード (Issue #413 / DA 致命 2 対応)。
  // `LINT_TOKENS_SRC_DIR=/nonexistent` のような誤設定や `TARGET_PATHS` の
  // 全パスが空 / 非存在になっている状態では、走査が成立せず Tripwire
  // 自体が機能しない。`exit 0` だと CI が誤って通ってしまうため、
  // 走査ファイル 0 件は構成不備として `exit 2` で fail-fast する
  // (旧 token 検出による `exit 1` と区別する)。
  if (files.length === 0) {
    console.error(
      "lint:tokens FATAL: no files scanned. TARGET_PATHS or LINT_TOKENS_SRC_DIR may be misconfigured.",
    );
    process.exit(2);
  }

  const violations: Violation[] = [];

  for (const file of files) {
    violations.push(...scanFile(file, LINT_PATTERNS));
  }

  if (violations.length === 0) {
    console.log(
      `lint:tokens OK - ${files.length} files scanned, no legacy token reference found.`,
    );
    process.exit(0);
  }

  console.error(
    `lint:tokens NG - ${violations.length} legacy token reference(s) found in ${files.length} files scanned:`,
  );
  for (const v of violations) {
    console.error(formatViolation(v));
  }
  console.error("");
  console.error(
    "Editorial Citrus 移行 (R-2c / Issue #390) で削除した旧 5 段階パレット",
  );
  console.error(
    "(bg.0..bg.4 / fg.0..fg.4 / colors.gruvbox.*) は既に panda.config.ts から",
  );
  console.error(
    "削除済みです。新 semantic token (bg.canvas / surface / elevated /",
  );
  console.error(
    "fg.primary / secondary / muted / accent.brand / link / focus.ring) に",
  );
  console.error(
    "置き換えてください。詳細は docs/rfc/editorial-citrus/02-color-system.md。",
  );
  process.exit(1);
};

/**
 * `node scripts/lintTokens.ts` で直接起動された場合のみ `main()` を実行する。
 * テストから `import` した際に副作用 (process.exit) が走らないようにするための
 * エントリポイントガード (Issue #621 / Should #5)。
 *
 * 判定は `scripts/newPost.ts` の `isDirectInvocation` と同じく `path.basename`
 * 経由で行い、OS 依存のパス区切り (POSIX `/` / Windows `\\`) 双方で同じ結果に
 * なるようにする。本プロジェクトは macOS/Linux 前提だが、basename ベースなら
 * CI を別 OS に持ち出した際にも同じ判定が走るため移植性のコストは無視できる。
 * 絶対パス完全一致比較 (`resolve()` + `fileURLToPath()`) を避けることで
 * symlink 経由起動等で対称性が崩れるリスクも排除している。
 */
const isDirectInvocation = (): boolean => {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }
  return basename(entry) === "lintTokens.ts";
};

if (isDirectInvocation()) {
  main();
}

export type {
  LintPattern,
  QuoteChar,
  SanitizedFile,
  ScanState,
  SkipCallback,
  SkipRecord,
  StepResult,
  Violation,
};
export {
  collectTargetFiles,
  extractSanitizedLine,
  handleBlockComment,
  handleDefault,
  handleStringLiteral,
  isAcceptableFile,
  isQuoteChar,
  iterateMatches,
  LINT_PATTERNS,
  offsetToLineColumn,
  processChar,
  processWalkEntry,
  reportSkippedTargets,
  sanitizeFile,
  scanFile,
  scanFileScope,
  scanLineScope,
  shouldSkipEntry,
  stripComments,
  tryEnterStringLiteral,
  tryMarkVisited,
  tryRealpath,
  tryStat,
  walkDirectory,
  walkDirectoryRecursive,
};
