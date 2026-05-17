/**
 * scripts/ 配下の Node ランタイム向け型拡張。
 *
 * 目的:
 *   `import.meta.dirname` の型解決を tsconfig.json 本体経由の型チェックで
 *   担保する。これは Node 20.11 / 21.2 以降で標準化された API であり、
 *   ランタイムには存在するが、`vite/client` / `@types/node` (古いバージョン)
 *   の型定義には含まれないことがあるため、ローカルで `ImportMeta` を
 *   ambient で拡張する。
 *
 * 配置理由:
 *   - `src/vite-env.d.ts` ではなく `scripts/` 配下に置くことで、
 *     「Node 専用スクリプトのための型補強」という責務を明確にする。
 *   - tsconfig.json の `include` が `["src", "scripts"]` を含むことで
 *     本ファイルは ambient 宣言としてプロジェクト全体に反映される。
 *
 * 注意:
 *   - `import.meta.filename` は scripts 配下で未使用のため宣言しない。
 *     将来必要になったら追加する。
 *   - `@types/node` を devDependencies に追加せず、追加依存ゼロで
 *     型解決を担保するための最小宣言。
 *
 * 関連 Issue:
 *   - #522: tsconfig.json 本体に scripts/ を追加 (`import.meta.dirname`
 *     型解決が前提)
 *   - PR #501: scripts/__tests__ を tsconfig.test.json でカバーした際に
 *     残された「tsconfig.json 本体への scripts 追加は別 Issue」の負債を解消。
 */

interface ImportMeta {
  /**
   * 現在のモジュールが存在するディレクトリの絶対パス (Node 標準)。
   * Node 20.11 / 21.2 以降で利用可能。
   */
  readonly dirname: string;
}
