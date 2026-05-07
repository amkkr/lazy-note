import { memo, useCallback, useEffect, useState } from "react";
import { css } from "../../../../styled-system/css";
import { SearchModal } from "./SearchModal";

const buttonStyle = css({
  display: "inline-flex",
  alignItems: "center",
  gap: "xs",
  background: "bg.2",
  color: "fg.1",
  border: "1px solid",
  borderColor: "bg.3",
  borderRadius: "md",
  paddingX: "sm-md",
  paddingY: "sm",
  cursor: "pointer",
  fontSize: "sm",
  _hover: {
    background: "bg.3",
  },
  _focus: {
    outline: "2px solid",
    outlineColor: "blue.light",
    outlineOffset: "2px",
  },
});

const shortcutHintStyle = css({
  display: "none",
  marginLeft: "xs",
  fontSize: "xs",
  color: "fg.3",
  fontFamily: "monospace",
  md: {
    display: "inline",
  },
});

/**
 * Header から開く検索トリガ + モーダル本体
 *
 * - クリック / `Cmd+K` / `Ctrl+K` でモーダルを開く
 * - `Escape` は HeadlessUI Dialog 側で扱われる
 */
const SearchTriggerInner = () => {
  const [isOpen, setIsOpen] = useState(false);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) {
        return;
      }
      event.preventDefault();
      setIsOpen((prev) => !prev);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={open}
        className={buttonStyle}
        aria-label="記事を検索"
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">🔍</span>
        <span>検索</span>
        <span className={shortcutHintStyle} aria-hidden="true">
          ⌘K
        </span>
      </button>
      <SearchModal isOpen={isOpen} onClose={close} />
    </>
  );
};

export const SearchTrigger = memo(SearchTriggerInner);
SearchTrigger.displayName = "SearchTrigger";
