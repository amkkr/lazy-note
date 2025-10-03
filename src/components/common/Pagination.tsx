import { css } from "../../../styled-system/css";
import { Button } from "../atoms/Button";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

/**
 * ページネーションコンポーネント
 * 前へ/次へボタンと現在のページ情報を表示
 */
export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) => {
  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  const handlePrevious = () => {
    if (canGoPrevious) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (canGoNext) {
      onPageChange(currentPage + 1);
    }
  };

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav
      className={css({
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "16px",
        marginTop: "32px",
        paddingY: "24px",
      })}
      aria-label="ページネーション"
    >
      <Button
        onClick={handlePrevious}
        disabled={!canGoPrevious}
        variant="secondary"
        className={css({
          minWidth: "100px",
        })}
      >
        前へ
      </Button>

      <span
        className={css({
          fontSize: "16px",
          fontWeight: "500",
          color: "text.primary",
          minWidth: "120px",
          textAlign: "center",
        })}
      >
        {currentPage} / {totalPages} ページ
      </span>

      <Button
        onClick={handleNext}
        disabled={!canGoNext}
        variant="secondary"
        className={css({
          minWidth: "100px",
        })}
      >
        次へ
      </Button>
    </nav>
  );
};
