import { useCallback, useSyncExternalStore } from "react";

/**
 * 解決済みのテーマ (DOM に適用される実体)。
 */
type ResolvedTheme = "dark" | "light";

/**
 * ユーザーの嗜好。"system" は prefers-color-scheme に追従する状態を指す。
 */
type ThemePreference = ResolvedTheme | "system";

const STORAGE_KEY = "theme";
const MEDIA_QUERY = "(prefers-color-scheme: light)";

/**
 * localStorage から手動上書きされたテーマを取得する。
 * 値が "light" / "dark" 以外 (未設定や不正値) は null を返し、system 追従となる。
 */
const readStoredPreference = (): ResolvedTheme | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") {
      return stored;
    }
  } catch {
    /* localStorage にアクセスできない環境では system 追従にフォールバック */
  }
  return null;
};

/**
 * prefers-color-scheme から system のテーマを解決する。
 * matchMedia が利用できない環境では "dark" にフォールバックする。
 */
const readSystemTheme = (): ResolvedTheme => {
  try {
    if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
      return window.matchMedia(MEDIA_QUERY).matches ? "light" : "dark";
    }
  } catch {
    /* matchMedia が利用不可の環境ではフォールバック */
  }
  return "dark";
};

/**
 * 現在 DOM に適用されているテーマを解決する。
 * 優先順位: localStorage の手動設定 > prefers-color-scheme > "dark" フォールバック。
 */
const getResolvedTheme = (): ResolvedTheme => {
  const stored = readStoredPreference();
  if (stored !== null) {
    return stored;
  }
  return readSystemTheme();
};

/**
 * ユーザーの嗜好を取得する。手動設定がなければ "system" を返す。
 */
const getPreference = (): ThemePreference => readStoredPreference() ?? "system";

const getServerSnapshot = (): ResolvedTheme => "dark";

/**
 * useSyncExternalStore 用の subscribe。
 * - storage イベント (他タブの変更, 自タブからの dispatch)
 * - prefers-color-scheme の change (system 追従中の OS 設定変化)
 * の両方を購読する。
 */
const subscribe = (callback: () => void): (() => void) => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      callback();
    }
  };
  window.addEventListener("storage", handleStorage);

  let mediaQuery: MediaQueryList | null = null;
  const handleMedia = () => callback();
  try {
    if (typeof window.matchMedia === "function") {
      mediaQuery = window.matchMedia(MEDIA_QUERY);
      mediaQuery.addEventListener("change", handleMedia);
    }
  } catch {
    /* matchMedia 未対応環境では追従購読をスキップ */
  }

  return () => {
    window.removeEventListener("storage", handleStorage);
    mediaQuery?.removeEventListener("change", handleMedia);
  };
};

/**
 * DOM とユーザー嗜好の同期を行うカスタムフック。
 *
 * - `theme`: 現在 DOM に適用されているテーマ ("light" | "dark")
 * - `preference`: ユーザーの嗜好 ("light" | "dark" | "system")
 * - `setTheme(t)`: "light" / "dark" を手動指定する (localStorage 永続化)
 * - `setPreference(p)`: "system" を含めた嗜好を設定する
 *   - "system" を渡すと localStorage を削除し prefers-color-scheme 追従に戻す
 * - `toggleTheme()`: 現在の解決済みテーマを反転して手動設定する
 */
export const useTheme = () => {
  const theme = useSyncExternalStore(
    subscribe,
    getResolvedTheme,
    getServerSnapshot,
  );
  const preference = useSyncExternalStore(
    subscribe,
    getPreference,
    () => "system" as ThemePreference,
  );

  /**
   * storage イベントを発火して useSyncExternalStore に再評価を促す。
   * 同タブ内の変更は本来 storage イベントが発火しないため、明示的に dispatch する。
   */
  const notifyChange = useCallback(() => {
    window.dispatchEvent(new StorageEvent("storage", { key: STORAGE_KEY }));
  }, []);

  const applyTheme = useCallback((resolved: ResolvedTheme) => {
    document.documentElement.dataset.theme = resolved;
  }, []);

  const setPreference = useCallback(
    (next: ThemePreference) => {
      try {
        if (next === "system") {
          localStorage.removeItem(STORAGE_KEY);
          applyTheme(readSystemTheme());
        } else {
          localStorage.setItem(STORAGE_KEY, next);
          applyTheme(next);
        }
      } catch {
        /* localStorage 書き込み失敗時も DOM だけは反映する */
        if (next !== "system") {
          applyTheme(next);
        }
      }
      notifyChange();
    },
    [applyTheme, notifyChange],
  );

  const setTheme = useCallback(
    (next: ResolvedTheme) => {
      setPreference(next);
    },
    [setPreference],
  );

  const toggleTheme = useCallback(() => {
    setPreference(getResolvedTheme() === "dark" ? "light" : "dark");
  }, [setPreference]);

  return { theme, preference, setTheme, setPreference, toggleTheme };
};
