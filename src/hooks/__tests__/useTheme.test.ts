import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "../useTheme";

/**
 * matchMedia の戻り値をモックする。
 * change イベントを発火するために addEventListener / removeEventListener を補足する。
 */
type MediaListener = (e: MediaQueryListEvent) => void;

const setupMatchMedia = (initialMatches: boolean) => {
  let matches = initialMatches;
  const listeners = new Set<MediaListener>();

  const dispatchChange = (next: boolean) => {
    matches = next;
    for (const listener of listeners) {
      listener({ matches: next } as MediaQueryListEvent);
    }
  };

  const matchMediaMock = vi.fn((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn((_: string, listener: MediaListener) => {
      listeners.add(listener);
    }),
    removeEventListener: vi.fn((_: string, listener: MediaListener) => {
      listeners.delete(listener);
    }),
    dispatchEvent: vi.fn(),
  }));

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: matchMediaMock,
  });

  return { dispatchChange, matchMediaMock };
};

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.dataset.theme = "dark";
    setupMatchMedia(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("初期解決", () => {
    it("localStorageが空でprefers-color-scheme: darkの場合にdarkを返す", () => {
      setupMatchMedia(false);

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.preference).toBe("system");
    });

    it("localStorageが空でprefers-color-scheme: lightの場合にlightを返す", () => {
      setupMatchMedia(true);

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.preference).toBe("system");
    });

    it("localStorageに'light'が保存されている場合にlightを返す", () => {
      localStorage.setItem("theme", "light");

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.preference).toBe("light");
    });

    it("localStorageに'dark'が保存されている場合にdarkを返す", () => {
      localStorage.setItem("theme", "dark");
      setupMatchMedia(true);

      const { result } = renderHook(() => useTheme());

      // localStorage の手動設定が prefers-color-scheme より優先される
      expect(result.current.theme).toBe("dark");
      expect(result.current.preference).toBe("dark");
    });

    it("localStorageに不正値が入っていてもprefers-color-schemeにフォールバックする", () => {
      localStorage.setItem("theme", "neon");
      setupMatchMedia(true);

      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("light");
      expect(result.current.preference).toBe("system");
    });
  });

  describe("setTheme / setPreference", () => {
    it("setThemeでテーマをlightに切替できる", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.preference).toBe("light");
    });

    it("setThemeがlocalStorageに値を保存する", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(localStorage.getItem("theme")).toBe("light");
    });

    it("setThemeがdocument.documentElement.dataset.themeを更新する", () => {
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setTheme("light");
      });

      expect(document.documentElement.dataset.theme).toBe("light");
    });

    it("setPreferenceで'system'を指定するとlocalStorageから削除されprefers-color-schemeに追従する", () => {
      const { dispatchChange } = setupMatchMedia(false);
      localStorage.setItem("theme", "light");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.setPreference("system");
      });

      expect(localStorage.getItem("theme")).toBeNull();
      expect(result.current.preference).toBe("system");
      expect(result.current.theme).toBe("dark");

      // system 追従中は prefers-color-scheme 変更が反映される
      act(() => {
        dispatchChange(true);
      });
      expect(result.current.theme).toBe("light");
    });
  });

  describe("toggleTheme", () => {
    it("toggleThemeでdarkからlightに切替できる", () => {
      localStorage.setItem("theme", "dark");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.preference).toBe("light");
    });

    it("toggleThemeでlightからdarkに切替できる", () => {
      localStorage.setItem("theme", "light");
      const { result } = renderHook(() => useTheme());

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.preference).toBe("dark");
    });

    it("system追従中にtoggleThemeすると現在の解決済みテーマを反転して手動設定にする", () => {
      setupMatchMedia(false); // system = dark
      const { result } = renderHook(() => useTheme());

      expect(result.current.preference).toBe("system");
      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.toggleTheme();
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.preference).toBe("light");
      expect(localStorage.getItem("theme")).toBe("light");
    });
  });

  describe("prefers-color-scheme 追従", () => {
    it("system設定時にprefers-color-scheme変更で自動追従する", () => {
      const { dispatchChange } = setupMatchMedia(false);
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");

      act(() => {
        dispatchChange(true);
      });

      expect(result.current.theme).toBe("light");
    });

    it("手動設定時はprefers-color-scheme変更を無視する", () => {
      const { dispatchChange } = setupMatchMedia(false);
      localStorage.setItem("theme", "dark");
      const { result } = renderHook(() => useTheme());

      expect(result.current.theme).toBe("dark");
      expect(result.current.preference).toBe("dark");

      act(() => {
        dispatchChange(true);
      });

      // localStorage の手動設定が優先されるため dark のまま
      expect(result.current.theme).toBe("dark");
    });
  });

  describe("localStorage の堅牢性", () => {
    it("localStorage.getItem が例外を投げてもprefers-color-schemeから解決できる", () => {
      setupMatchMedia(true);
      const original = Storage.prototype.getItem;
      Storage.prototype.getItem = vi.fn(() => {
        throw new Error("blocked");
      });

      try {
        const { result } = renderHook(() => useTheme());
        expect(result.current.theme).toBe("light");
        expect(result.current.preference).toBe("system");
      } finally {
        Storage.prototype.getItem = original;
      }
    });

    it("localStorage.setItem が例外を投げてもDOMには反映される", () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = vi.fn(() => {
        throw new Error("quota");
      });

      try {
        const { result } = renderHook(() => useTheme());
        act(() => {
          result.current.setTheme("light");
        });
        expect(document.documentElement.dataset.theme).toBe("light");
      } finally {
        Storage.prototype.setItem = original;
      }
    });
  });
});
