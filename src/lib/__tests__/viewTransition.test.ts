import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import {
  buildPostHeroTransitionName,
  startViewTransition,
} from "../viewTransition";

/**
 * `startViewTransition` ラッパーの振る舞いテスト (Issue #397)。
 *
 * jsdom 環境では `document.startViewTransition` は標準で未定義なので、
 * 必要に応じて手動で生やしたり消したりして「対応している環境」「未対応の環境」
 * の両方をシミュレートする。
 */
describe("startViewTransition", () => {
  // 各テストごとに matchMedia と document.startViewTransition を
  // 復元できるよう保存しておく。
  // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
  let originalMatchMedia: any;
  // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
  let originalStartVT: any;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    originalStartVT = (document as any).startViewTransition;
  });

  afterEach(() => {
    // 復元
    if (originalMatchMedia === undefined) {
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      delete (window as any).matchMedia;
    } else {
      window.matchMedia = originalMatchMedia;
    }

    if (originalStartVT === undefined) {
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      delete (document as any).startViewTransition;
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      (document as any).startViewTransition = originalStartVT;
    }
  });

  it("View Transitions API 未対応の場合は callback を即時実行する", () => {
    // jsdom 既定では startViewTransition が無いので未対応扱いになる
    // 念のため明示的に削除
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    delete (document as any).startViewTransition;

    const callback = vi.fn();
    startViewTransition(callback);

    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("prefers-reduced-motion: reduce の場合は callback を即時実行する", () => {
    // startViewTransition がある状態でも、reduced motion なら呼ばずに直接 callback
    const startVTSpy = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (document as any).startViewTransition = startVTSpy;

    // matchMedia をモックして reduced motion を返す
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    })) as any;

    const callback = vi.fn();
    startViewTransition(callback);

    expect(callback).toHaveBeenCalledTimes(1);
    expect(startVTSpy).not.toHaveBeenCalled();
  });

  it("未対応かつ reduced-motion でない場合 startViewTransition を呼び出す", () => {
    const startVTSpy = vi.fn();
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (document as any).startViewTransition = startVTSpy;

    // matchMedia は reduced motion を返さないモック
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    })) as any;

    const callback = vi.fn();
    startViewTransition(callback);

    // VT API に callback が委譲されること (callback はラップされて中で呼ばれる想定)
    expect(startVTSpy).toHaveBeenCalledTimes(1);
    expect(startVTSpy).toHaveBeenCalledWith(callback);
  });

  it("matchMedia が無い環境でも安全に callback を即時実行できる", () => {
    // matchMedia 自体を消す (古いブラウザ想定)
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (window as any).matchMedia = undefined;
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    delete (document as any).startViewTransition;

    const callback = vi.fn();
    expect(() => startViewTransition(callback)).not.toThrow();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("対応環境で例外を投げず VT 呼び出しに委譲する (二重発火耐性)", () => {
    // 連続発火しても本ラッパー側でエラーや throttle は発生せず、
    // 単純に VT API に都度委譲することを確認する。
    let calls = 0;
    const startVTMock: MockInstance = vi
      .fn()
      .mockImplementation(() => {
        calls += 1;
      });
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (document as any).startViewTransition = startVTMock;
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    }) as any;

    startViewTransition(() => {});
    startViewTransition(() => {});
    startViewTransition(() => {});

    expect(calls).toBe(3);
  });
});

describe("buildPostHeroTransitionName", () => {
  it("post-{id} 形式の文字列を返す", () => {
    expect(buildPostHeroTransitionName("123")).toBe("post-123");
  });

  it("UUID-like な ID でも prefix を付けて返す", () => {
    expect(buildPostHeroTransitionName("abc-def-1234")).toBe(
      "post-abc-def-1234",
    );
  });
});
