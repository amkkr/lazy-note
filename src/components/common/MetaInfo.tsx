import { memo } from "react";
import { css } from "../../../styled-system/css";
import { Calendar, Clock, PenLine } from "../atoms/icons";

interface MetaInfoProps {
  createdAt?: string;
  author?: string;
  readingTimeMinutes?: number;
  variant?: "card" | "header" | "featured" | "bento";
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

// featured 用は中央寄せではなく左寄せの行 (タイトルの上に控えめに乗る用途)。
// Issue #424 で `textTransform: uppercase` と `letterSpacing: 0.08em` を撤去。
// 英字主体の著者名 (例: `amkkr`) がデータ表記のまま意図せず大文字化される
// 不具合を解消するため、Featured メタ行はコンテンツの原文表記を尊重する。
// Editorial 雑誌風の装飾は `featuredLabelStyles` (FeaturedCard.tsx) 側に集約する。
const containerFeaturedStyles = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  flexWrap: "wrap",
  gap: "md",
  fontSize: "xs",
});

// bento 用は小さめの行間で左寄せ
const containerBentoStyles = css({
  display: "flex",
  alignItems: "center",
  justifyContent: "flex-start",
  flexWrap: "wrap",
  gap: "sm-md",
  fontSize: "xs",
});

const itemBaseStyles = css({
  display: "flex",
  alignItems: "center",
  gap: "sm",
  fontSize: "sm",
});

// featured / bento variant のアイテムは少し小さめ・gap も狭め
const itemCompactStyles = css({
  display: "flex",
  alignItems: "center",
  gap: "xs",
  fontSize: "xs",
});

// Editorial Citrus トークン (R-2b / Issue #389)
// - card variant: 補助情報のため fg.muted を使用
// - header variant: 見出し相当のため fg.primary を使用
// - featured variant: Featured 大見出しの上に置く控えめな補助行 (case 変形なし)
//   のため fg.secondary を使い、上部に静かに配置する (Issue #395 / #424)。
// - bento variant: Bento カード内の補助情報。fg.secondary で本文寄り扱い。
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

const itemFeaturedStyles = css({
  color: "fg.secondary",
});

const itemBentoStyles = css({
  color: "fg.secondary",
});

// アイコンの表示サイズ。本文 sm (14px) のラインハイトに合わせて 14px。
const ICON_SIZE = 14;
// Featured / Bento はコンパクト表示のためアイコンサイズを縮小
const ICON_SIZE_COMPACT = 12;

// variant ごとのスタイル / アイコンサイズの lookup table。
// 三項演算子の連鎖で複雑度が上がるのを避けるため、辞書として一括定義する。
type Variant = NonNullable<MetaInfoProps["variant"]>;

interface VariantStyleSet {
  readonly container: string;
  readonly item: string;
  readonly itemBase: string;
  readonly iconSize: number;
}

const variantStyleSets: Record<Variant, VariantStyleSet> = {
  card: {
    container: containerStyles,
    item: itemCardStyles,
    itemBase: itemBaseStyles,
    iconSize: ICON_SIZE,
  },
  header: {
    container: containerStyles,
    item: itemHeaderStyles,
    itemBase: itemBaseStyles,
    iconSize: ICON_SIZE,
  },
  featured: {
    container: containerFeaturedStyles,
    item: itemFeaturedStyles,
    itemBase: itemCompactStyles,
    iconSize: ICON_SIZE_COMPACT,
  },
  bento: {
    container: containerBentoStyles,
    item: itemBentoStyles,
    itemBase: itemCompactStyles,
    iconSize: ICON_SIZE_COMPACT,
  },
};

/**
 * メタ情報コンポーネント（CSS定数抽出 + React.memoでメモ化）
 *
 * R-4 (Issue #392) で日付・著者・読了時間の絵文字装飾を inline SVG の
 * Calendar / PenLine / Clock に置換。アイコン自体は装飾扱いとして
 * `aria-hidden` で SR から隠し、隣接テキストで意味を伝える。
 *
 * Issue #395 (Editorial Bento) で featured / bento variant を追加。
 * Issue #424 で featured variant の uppercase / letter-spacing を撤去し、
 * 英字著者名のコンテンツデータが原文表記のまま表示されるよう修正。
 * - featured: Featured ヒーロー上の控えめな補助行 (case 変形なし)
 * - bento: Bento カード内の補助情報行
 */
export const MetaInfo = memo(
  ({
    createdAt,
    author,
    readingTimeMinutes,
    variant = "card",
  }: MetaInfoProps) => {
    const styles = variantStyleSets[variant];
    const itemClassName = `${styles.itemBase} ${styles.item}`;

    return (
      <div className={styles.container}>
        <div className={itemClassName}>
          <Calendar aria-hidden="true" size={styles.iconSize} />
          <span>{createdAt || "日付未設定"}</span>
        </div>
        <div className={itemClassName}>
          <PenLine aria-hidden="true" size={styles.iconSize} />
          <span>{author || "匿名"}</span>
        </div>
        {readingTimeMinutes !== undefined && (
          <div className={itemClassName}>
            <Clock aria-hidden="true" size={styles.iconSize} />
            <span>{readingTimeMinutes}分で読了</span>
          </div>
        )}
      </div>
    );
  },
);

MetaInfo.displayName = "MetaInfo";
