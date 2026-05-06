import { memo } from "react";
import { css } from "../../../styled-system/css";

interface MetaInfoProps {
  createdAt?: string;
  author?: string;
  variant?: "card" | "header";
}

// スタイルをコンポーネント外に定数として定義
const containerStyles = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexWrap: "wrap",
  gap: "sm",
  md: {
    gap: "md",
    flexWrap: "nowrap",
  },
});

const itemBaseStyles = css({
  display: "flex",
  alignItems: "center",
  gap: "sm",
  fontSize: "sm",
});

const itemCardStyles = css({
  color: "fg.4",
});

const itemHeaderStyles = css({
  color: "fg.0",
  background: "rgba(251, 241, 199, 0.15)",
  paddingY: "sm",
  paddingX: "md",
  borderRadius: "xl",
});

/**
 * メタ情報コンポーネント（CSS定数抽出 + React.memoでメモ化）
 */
export const MetaInfo = memo(
  ({ createdAt, author, variant = "card" }: MetaInfoProps) => {
    const itemVariantStyles =
      variant === "header" ? itemHeaderStyles : itemCardStyles;

    return (
      <div className={containerStyles}>
        <div className={`${itemBaseStyles} ${itemVariantStyles}`}>
          <span>📅</span>
          <span>{createdAt || "日付未設定"}</span>
        </div>
        <div className={`${itemBaseStyles} ${itemVariantStyles}`}>
          <span>✍️</span>
          <span>{author || "匿名"}</span>
        </div>
      </div>
    );
  },
);

MetaInfo.displayName = "MetaInfo";
