import { useCallback, useSyncExternalStore } from "react";

type Theme = "dark" | "light";
const STORAGE_KEY = "theme";

const getThemeSnapshot = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* localStorageにアクセスできない場合はデフォルト値を返す */
  }
  return "dark";
};

const getServerSnapshot = (): Theme => "dark";

const subscribe = (callback: () => void): (() => void) => {
  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) callback();
  };
  window.addEventListener("storage", handleStorage);
  return () => window.removeEventListener("storage", handleStorage);
};

export const useTheme = () => {
  const theme = useSyncExternalStore(
    subscribe,
    getThemeSnapshot,
    getServerSnapshot,
  );

  const setTheme = useCallback((newTheme: Theme) => {
    localStorage.setItem(STORAGE_KEY, newTheme);
    document.documentElement.dataset.theme = newTheme;
    window.dispatchEvent(
      new StorageEvent("storage", { key: STORAGE_KEY }),
    );
  }, []);

  const toggleTheme = useCallback(() => {
    const current = getThemeSnapshot();
    setTheme(current === "dark" ? "light" : "dark");
  }, [setTheme]);

  return { theme, setTheme, toggleTheme };
};
