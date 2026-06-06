import { memo } from "react";
import { css } from "../../../styled-system/css";
import { AUTHOR_FALLBACK, DATE_FALLBACK } from "../../lib/i18nLiterals";
import { isUpdatedAfterCreated } from "../../lib/postDate";
import { Calendar, Clock, PenLine } from "../atoms/icons";

interface MetaInfoProps {
  createdAt?: string;
  author?: string;
  readingTimeMinutes?: number;
  /**
   * 加筆日時の表示文字列 (`YYYY/MM/DD HH:MM` 等)。
   *
   * Issue #809: `createdAt` より厳密に新しい場合のみ「更新: <日時>」行を
   * 追加する。新旧判定は #808 の `isUpdatedAfterCreated` に委譲する。
   */
  updatedAt?: string;
  variant?: "card" | "header" | "featured" | "bento";
}

// Issue #721 (PR #715 follow-up): 表示文言テンプレートを定数として外出し。
// `"分で読了"` は単一ファイル内で完結する文言のため `i18nLiterals.ts` への
// 横串集約はせず、ファイル内ローカル定数に留める (Issue #534 / #630 方針、
// CLAUDE.md「ファイル内局所定数」と「横串共通定数」の使い分け基準に準拠)。
// テンプレート関数形式は `Coordinate.tsx` の `COORDINATE_LABEL_TEMPLATE` /
// `Resurface.tsx` の `RESURFACE_REASON_LABEL_*_TEMPLATE` に倣う。
const READING_TIME_LABEL_TEMPLATE = (minutes: number): string =>
  `${minutes}分で読了`;

// Issue #809: 加筆日時の表示文言テンプレート。`READING_TIME_LABEL_TEMPLATE` と
// 同方針で、単一ファイル内で完結する文言のため `i18nLiterals.ts` への横串集約は
// せず、ファイル内ローカル定数に留める (Issue #721 / #534 / #630 方針)。
const UPDATED_AT_LABEL_TEMPLATE = (value: string): string => `更新: ${value}`;

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
// - card variant: 補助情報のため fg.muted を使用。bg.surface 上に置かれる前提で
//   WCAG 1.4.3 AA (4.5:1) を満たす (実測 light 6.17:1 / dark 7.91:1。light は
//   AAA 7:1 未達のため補助情報専用で本文転用は不可。検証は colorTokens.test.ts
//   §"Issue #537")。
// - header variant: 見出し相当のため fg.primary を使用
// - featured variant: Featured 大見出しの上に置く控えめな補助行 (case 変形なし)
//   のため fg.secondary を使い、上部に静かに配置する (Issue #395 / #424)。
// - bento variant: Bento カード内の補助情報。fg.secondary で本文寄り扱い。
const itemCardStyles = css({
  color: "fg.muted",
});

const itemHeaderStyles = css({
  color: "fg.primary",
  background: "bg.muted",
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
  /**
   * variant が container に適用する `text-transform` の値。
   *
   * Issue #424 で featured variant の `textTransform: uppercase` を撤去した
   * (英字主体の著者名がデータ表記のまま大文字化される不具合の解消)。
   * 現状すべての variant が `none` (原文表記を尊重) だが、誰かが再び uppercase
   * を持ち込んだら regression として検知できるよう値を明示する。
   *
   * Issue #480: 旧テストは `not.toMatch(/tt_uppercase/)` で className 文字列を
   * 検証していたが、Panda の `hash: true` で class 名が hash 化されると常に
   * true となり regression を検知できなくなる (false negative)。PR #474 の
   * Option A に倣い `data-text-transform` 意味属性として宣言する。
   */
  readonly textTransform: "none" | "uppercase";
  /**
   * item (日付 / 著者 / 読了時間の各行) が参照する背景 Panda token。
   *
   * header variant のみ `bg.muted` の塗りを持つ pill 表示で、その他の variant
   * は背景なし (undefined)。
   *
   * Issue #480: 旧テストは `metaInfo.querySelector('[class*="bg_"]')` で
   * className 文字列に "bg_" が含まれるかを検証していたが、`hash: true` で
   * class 名が hash 化されると card variant の `not.toBeInTheDocument()` が
   * 常に成立し regression を検知できなくなる (false negative)。item に
   * `data-token-bg` 意味属性を出すことで属性ベースに移行する。
   */
  readonly itemBg?: string;
}

const variantStyleSets: Record<Variant, VariantStyleSet> = {
  card: {
    container: containerStyles,
    item: itemCardStyles,
    itemBase: itemBaseStyles,
    iconSize: ICON_SIZE,
    textTransform: "none",
  },
  header: {
    container: containerStyles,
    item: itemHeaderStyles,
    itemBase: itemBaseStyles,
    iconSize: ICON_SIZE,
    textTransform: "none",
    // header variant の item は bg.muted の pill 背景を持つ。
    itemBg: "bg.muted",
  },
  featured: {
    container: containerFeaturedStyles,
    item: itemFeaturedStyles,
    itemBase: itemCompactStyles,
    iconSize: ICON_SIZE_COMPACT,
    // Issue #424: uppercase を撤去済み。原文表記を尊重する。
    textTransform: "none",
  },
  bento: {
    container: containerBentoStyles,
    item: itemBentoStyles,
    itemBase: itemCompactStyles,
    iconSize: ICON_SIZE_COMPACT,
    textTransform: "none",
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
    updatedAt,
    variant = "card",
  }: MetaInfoProps) => {
    const styles = variantStyleSets[variant];
    const itemClassName = `${styles.itemBase} ${styles.item}`;

    return (
      <div
        className={styles.container}
        data-variant={variant}
        data-text-transform={styles.textTransform}
      >
        <div className={itemClassName} data-token-bg={styles.itemBg}>
          <Calendar aria-hidden="true" size={styles.iconSize} />
          <span>{createdAt || DATE_FALLBACK}</span>
        </div>
        <div className={itemClassName} data-token-bg={styles.itemBg}>
          <PenLine aria-hidden="true" size={styles.iconSize} />
          <span>{author || AUTHOR_FALLBACK}</span>
        </div>
        {readingTimeMinutes !== undefined && (
          <div className={itemClassName} data-token-bg={styles.itemBg}>
            <Clock aria-hidden="true" size={styles.iconSize} />
            <span>{READING_TIME_LABEL_TEMPLATE(readingTimeMinutes)}</span>
          </div>
        )}
        {/*
          Issue #809: updatedAt が createdAt より厳密に新しいときだけ加筆日時行を
          追加する。新旧判定は #808 の `isUpdatedAfterCreated` に委譲する。
          空文字 (`updatedAt=""`) のとき React が空テキストノードを残さないよう
          `!!updatedAt` で真偽値化してから条件評価する。
          専用アイコンが無いため `Clock` を再利用する (読了時間と同じアイコンに
          なるが、行の構造的識別子は `data-meta-field="updated"` を唯一とし、
          アイコンは行の識別には使わない)。
        */}
        {!!updatedAt && isUpdatedAfterCreated(createdAt ?? "", updatedAt) && (
          <div
            className={itemClassName}
            data-token-bg={styles.itemBg}
            data-meta-field="updated"
          >
            <Clock aria-hidden="true" size={styles.iconSize} />
            <span>{UPDATED_AT_LABEL_TEMPLATE(updatedAt)}</span>
          </div>
        )}
      </div>
    );
  },
);

MetaInfo.displayName = "MetaInfo";
