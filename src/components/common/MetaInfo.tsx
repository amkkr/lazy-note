import { memo } from "react";
import { css } from "../../../styled-system/css";
import { Calendar, Clock, PenLine } from "../atoms/icons";

interface MetaInfoProps {
  createdAt?: string;
  author?: string;
  readingTimeMinutes?: number;
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

// Editorial Citrus トークン (R-2b / Issue #389)
// - card variant: 補助情報のため fg.muted を使用
// - header variant: 見出し相当のため fg.primary を使用
const itemCardStyles = css({
  color: "fg.muted",
});

const itemHeaderStyles = css({
  color: "fg.primary",
  background: "rgba(251, 241, 199, 0.15)",
  paddingY: "sm",
  paddingX: "md",
  borderRadius: "xl",
});

// アイコンの表示サイズ。本文 sm (14px) のラインハイトに合わせて 14px。
const ICON_SIZE = 14;

/**
 * メタ情報コンポーネント（CSS定数抽出 + React.memoでメモ化）
 *
 * R-4 (Issue #392) で日付・著者・読了時間の絵文字装飾を inline SVG の
 * Calendar / PenLine / Clock に置換。アイコン自体は装飾扱いとして
 * `aria-hidden` で SR から隠し、隣接テキストで意味を伝える。
 */
export const MetaInfo = memo(
  ({
    createdAt,
    author,
    readingTimeMinutes,
    variant = "card",
  }: MetaInfoProps) => {
    const itemVariantStyles =
      variant === "header" ? itemHeaderStyles : itemCardStyles;

    return (
      <div className={containerStyles}>
        <div className={`${itemBaseStyles} ${itemVariantStyles}`}>
          <Calendar aria-hidden="true" size={ICON_SIZE} />
          <span>{createdAt || "日付未設定"}</span>
        </div>
        <div className={`${itemBaseStyles} ${itemVariantStyles}`}>
          <PenLine aria-hidden="true" size={ICON_SIZE} />
          <span>{author || "匿名"}</span>
        </div>
        {readingTimeMinutes !== undefined && (
          <div className={`${itemBaseStyles} ${itemVariantStyles}`}>
            <Clock aria-hidden="true" size={ICON_SIZE} />
            <span>{readingTimeMinutes}分で読了</span>
          </div>
        )}
      </div>
    );
  },
);

MetaInfo.displayName = "MetaInfo";
