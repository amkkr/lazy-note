import "@testing-library/jest-dom";
import { toHaveNoViolations } from "jest-axe";
import { expect } from "vitest";

// jest-axe の toHaveNoViolations マッチャを Vitest の expect に登録する。
// Issue #491 (Coordinate) の AC「axe で PostDetailPage に新規違反が出ないこと」
// の検証手段として導入。jsdom 環境で動作し、React Testing Library の render
// 結果 (container) に対して `expect(await axe(container)).toHaveNoViolations()`
// の形で使う。
expect.extend(toHaveNoViolations);
