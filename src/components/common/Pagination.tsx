import { memo, useCallback } from "react";
import { css } from "../../../styled-system/css";
import { Button } from "../atoms/Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// スタイルをコンポーネント外に定数として定義
const navStyles = css({
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  gap: "16px",
  marginTop: "32px",
  paddingY: "24px",
});

const buttonMinWidthStyles = css({
  minWidth: "100px",
});

const pageInfoStyles = css({
  fontSize: "16px",
  fontWeight: "500",
  color: "text.primary",
  minWidth: "120px",
  textAlign: "center",
});

/**
 * ページネーションコンポーネント（CSS定数抽出 + React.memoでメモ化）
 * 前へ/次へボタンと現在のページ情報を表示
 */
export const Pagination = memo(({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = useCallback(() => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  }, [currentPage, onPageChange]);

  const handleNext = useCallback(() => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  }, [currentPage, totalPages, onPageChange]);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className={navStyles} aria-label="ページネーション">
      <Button
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        variant="secondary"
        className={buttonMinWidthStyles}
      >
        前へ
      </Button>

      <span className={pageInfoStyles}>
        {currentPage} / {totalPages} ページ
      </span>

      <Button
        onClick={handleNext}
        disabled={!canGoNext}
        variant="secondary"
        className={buttonMinWidthStyles}
      >
        次へ
      </Button>
    </nav>
  );
});

Pagination.displayName = "Pagination";
