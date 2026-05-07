import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { memo, useCallback, useEffect, useId, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { css } from "../../../../styled-system/css";
import { useSearch } from "./useSearch";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const backdropStyle = css({
  position: "fixed",
  inset: 0,
  background: "overlay",
});

const containerStyle = css({
  position: "fixed",
  inset: 0,
  display: "flex",
  alignItems: "flex-start",
  justifyContent: "center",
  paddingTop: "xl",
  paddingX: "md",
});

const panelStyle = css({
  width: "100%",
  maxWidth: "content",
  background: "bg.1",
  color: "fg.1",
  borderRadius: "lg",
  boxShadow: "card-hover",
  overflow: "hidden",
  display: "flex",
  flexDirection: "column",
  maxHeight: "80vh",
});

const headerStyle = css({
  display: "flex",
  alignItems: "center",
  gap: "sm",
  padding: "sm-md",
  borderBottom: "1px solid",
  borderColor: "bg.3",
});

const inputStyle = css({
  flex: 1,
  appearance: "none",
  background: "transparent",
  color: "fg.1",
  border: "none",
  outline: "none",
  fontSize: "base",
  padding: "sm",
  _focus: {
    outline: "none",
  },
});

const closeButtonStyle = css({
  background: "bg.2",
  color: "fg.1",
  border: "1px solid",
  borderColor: "bg.3",
  borderRadius: "md",
  padding: "xs sm",
  cursor: "pointer",
  fontSize: "sm",
  _hover: {
    background: "bg.3",
  },
});

const listStyle = css({
  margin: 0,
  padding: 0,
  listStyle: "none",
  overflowY: "auto",
});

const itemStyle = css({
  borderBottom: "1px solid",
  borderColor: "bg.3",
  "&:last-child": {
    borderBottom: "none",
  },
});

const itemButtonStyle = css({
  display: "block",
  width: "100%",
  textAlign: "left",
  background: "transparent",
  color: "fg.1",
  border: "none",
  cursor: "pointer",
  padding: "sm-md",
  _hover: {
    background: "bg.2",
  },
  _focus: {
    outline: "2px solid",
    outlineColor: "blue.light",
    outlineOffset: "-2px",
  },
});

const itemTitleStyle = css({
  fontSize: "base",
  fontWeight: "bold",
  color: "fg.1",
  marginBottom: "xs",
});

const itemExcerptStyle = css({
  fontSize: "sm",
  color: "fg.3",
  lineHeight: "body",
});

const itemTagsStyle = css({
  display: "flex",
  flexWrap: "wrap",
  gap: "xs",
  marginTop: "xs",
});

const tagStyle = css({
  display: "inline-block",
  fontSize: "xs",
  background: "bg.2",
  color: "fg.2",
  paddingX: "sm",
  paddingY: "xs",
  borderRadius: "full",
});

const statusStyle = css({
  padding: "sm-md",
  fontSize: "sm",
  color: "fg.3",
  textAlign: "center",
});

const liveRegionStyle = css({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0,0,0,0)",
  whiteSpace: "nowrap",
  border: 0,
});

const SearchModalInner = ({ isOpen, onClose }: SearchModalProps) => {
  const navigate = useNavigate();
  const titleId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const baseUrl = import.meta.env.BASE_URL;
  const { query, setQuery, results, isReady, hasError, totalIndexed } =
    useSearch(isOpen, baseUrl);

  // モーダルを閉じたときにクエリをリセットして履歴を残さない
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
    }
  }, [isOpen, setQuery]);

  const handleSelect = useCallback(
    (id: string) => {
      onClose();
      navigate(`/posts/${id}`);
    },
    [navigate, onClose],
  );

  /**
   * ↓ ↑ で結果リストにフォーカス移動するキーボードナビゲーション
   * - 入力中に ↓ で先頭の結果にフォーカス
   * - 結果項目同士の ↑ / ↓ は次/前のボタンへ
   */
  const handleInputKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "ArrowDown" && listRef.current) {
        const firstButton = listRef.current.querySelector<HTMLButtonElement>(
          "button[data-search-result]",
        );
        if (firstButton) {
          event.preventDefault();
          firstButton.focus();
        }
      }
    },
    [],
  );

  const handleResultKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      const list = listRef.current;
      if (!list) {
        return;
      }
      const buttons = Array.from(
        list.querySelectorAll<HTMLButtonElement>("button[data-search-result]"),
      );
      const currentIndex = buttons.indexOf(event.currentTarget);
      if (currentIndex === -1) {
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        const next = buttons[currentIndex + 1];
        if (next) {
          next.focus();
        }
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        if (currentIndex === 0) {
          inputRef.current?.focus();
        } else {
          buttons[currentIndex - 1]?.focus();
        }
      }
    },
    [],
  );

  /**
   * 結果件数のステータス表示文言
   */
  const renderStatus = (): string => {
    if (hasError) {
      return "検索インデックスを読み込めませんでした";
    }
    if (!isReady) {
      return "検索インデックスを読み込み中…";
    }
    if (query.trim().length === 0) {
      return `${totalIndexed} 件の記事から検索できます`;
    }
    return `${results.length} 件ヒット`;
  };

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      aria-labelledby={titleId}
      initialFocus={inputRef}
    >
      <DialogBackdrop className={backdropStyle} />
      <div className={containerStyle}>
        <DialogPanel className={panelStyle}>
          <h2 id={titleId} className={liveRegionStyle}>
            記事を検索
          </h2>
          <div className={headerStyle}>
            <input
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleInputKeyDown}
              placeholder="タイトル・タグ・本文で検索"
              aria-label="検索キーワード"
              aria-controls="search-results-list"
              autoComplete="off"
              spellCheck={false}
              className={inputStyle}
            />
            <button
              type="button"
              onClick={onClose}
              className={closeButtonStyle}
              aria-label="検索を閉じる"
            >
              閉じる
            </button>
          </div>

          <div className={statusStyle} aria-live="polite" role="status">
            {renderStatus()}
          </div>

          <ul
            id="search-results-list"
            ref={listRef}
            className={listStyle}
            aria-label="検索結果"
          >
            {results.map((entry) => (
              <li key={entry.id} className={itemStyle}>
                <button
                  type="button"
                  data-search-result
                  className={itemButtonStyle}
                  onClick={() => handleSelect(entry.id)}
                  onKeyDown={handleResultKeyDown}
                >
                  <div className={itemTitleStyle}>
                    {entry.title || "無題の記事"}
                  </div>
                  {entry.excerpt && (
                    <div className={itemExcerptStyle}>{entry.excerpt}</div>
                  )}
                  {entry.tags.length > 0 && (
                    <div className={itemTagsStyle}>
                      {entry.tags.map((tag) => (
                        <span key={tag} className={tagStyle}>
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </DialogPanel>
      </div>
    </Dialog>
  );
};

export const SearchModal = memo(SearchModalInner);
SearchModal.displayName = "SearchModal";
