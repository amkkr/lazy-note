// import が 1 つも無いと、下の declare module "vitest" が型の拡張ではなく
// vitest の型を置き換える宣言になるため、vitest を明示的に import しておく
import "vitest";
import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers";

/**
 * jest-dom と jest-axe のマッチャを vitest の expect() の型で使えるようにする
 * (実行時のマッチャ登録は setup.ts で行う)。
 *
 * vitest 5 はグローバルの jest.Matchers を読まなくなったが、setup.ts で読み込む
 * @testing-library/jest-dom と @types/jest-axe の型は Jest 用の Matchers
 * (jest.Matchers など) しか拡張していないため、vitest 側の拡張ポイントである
 * Matchers に宣言し直す。
 * 型引数名は vitest 側の宣言 (R: マッチャの戻り値の型、T: expect() に渡した
 * 値の型) と揃える必要がある。skipLibCheck によりこのファイル自体の誤りは
 * 型チェックで報告されない。
 *
 * 削除の目安:
 * - TestingLibraryMatchers の継承: @testing-library/jest-dom/vitest が vitest 5
 *   に対応した版に上げ、setup.ts と tsconfig の types をそのエントリに
 *   切り替えたら不要 (https://github.com/testing-library/jest-dom/issues/738)
 * - toHaveNoViolations: @types/jest-axe が vitest の Matchers を拡張していない
 *   間は必要
 */
declare module "vitest" {
  interface Matchers<R, T> extends TestingLibraryMatchers<unknown, R> {
    toHaveNoViolations(): R;
  }
}
