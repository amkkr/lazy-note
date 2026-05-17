import { type CSSProperties, memo } from "react";
import { css } from "../../../styled-system/css";
import type { ResurfacedEntry, ResurfaceReason } from "../../lib/resurface";
import { buildPostHeroTransitionName } from "../../lib/viewTransition";
import { Link } from "../atoms/Link";

interface ResurfaceProps {
  /**
   * 浮上対象の記事と理由。null のとき何も描画しない (スロット非表示)。
   *
   * 算出は `selectResurfaced` (`src/lib/resurface.ts`) を使う。HomePage 側で
   * 算出して prop として渡すことで、コンポーネントを純粋に保つ。
   */
  entry: ResurfacedEntry | null;
  /**
   * 表示 OFF フラグ (撤退可能性 / Issue #492 AC)。
   *
   * Anchor 企画は「いつでも黙らせられる」ことを設計要件とする。Resurface を
   * 独立に OFF にできるよう、entry が非 null でも show=false なら描画しない。
   * 既定 true。
   */
  show?: boolean;
}

/**
 * Resurface — Anchor の3つの顔のひとつ「再浮上」(Issue #492 / epic #487)。
 *
 * HomePage の新着エリア (Featured / Bento / Index) の **下** に独立スロット
 * を設け、過去記事を 1 件浮上させる。優先順位は (1) 沈黙トリガー (2) 暦の節目
 * (3) 座標上の意味 (節目記念日) の順で `selectResurfaced` が選定する。
 *
 * 設計の核 (epic #487 / Issue #492):
 * - **投稿頻度・投稿間隔の数値は一切表示しない** (Pulse を切った思想を厳守)
 * - 該当記事が無いとき (entry===null) はスロットごと非表示にして空欄を作らない
 * - 「新着の隣に並べず」独立スロットで意味的に分離 (aria-label="過去の記事")
 * - 既存 BentoCard / IndexRow のスタイル語彙を踏襲 (border.subtle / bg.surface /
 *   tabular-nums / fg.primary / fg.secondary / accent.link 系の hover 強調)
 * - 文脈ラベルを記事カード上に **静かに** 付与する (reason.kind に応じて
 *   "1 年前のあなたの声" / "もう一度" / "1 年前の今日" / "{label} から 1 年経った日")
 * - Hero morph (Issue #397) を継承するため `view-transition-name: post-{id}` を
 *   タイトル H3 に付与 (= 詳細遷移時に既存パターンと同じ morph が走る)
 *
 * 撤退可能性:
 * - `show=false` で個別に OFF にできる
 * - entry===null (= 該当記事なし) なら自動でスロット非表示
 * - milestones.json を空にすれば座標が消えて節目記念日も発火しなくなる (層2のみで動く)
 *
 * a11y:
 * - section に role=region + aria-label で SR に意味的分離を伝える
 * - 見出し h3 は HomePage の階層 (Featured h2 → BentoCard/Index h3 → Resurface h3)
 *   と並列にして逆転を回避
 * - 文脈ラベルは <span> として配置 (h3 と並べる小型の Editorial 風タグライン)
 * - Link variant="card" の既存 focus ring (citrus 二重リング) を継承
 *
 * AA 担保 (calculateContrast.ts による実測値、BentoCard / IndexRow と同様):
 * - bg.surface × fg.primary: 16.19:1 (light) / 7.93:1 (dark) AAA
 * - bg.surface × fg.secondary: light 9.59:1 / dark 14.84:1 AAA
 * - bg.canvas × fg.muted: light 6.54:1 (AA / AAA 未達) / dark 14.84:1 AAA
 *   (セクション見出し "過去の記事" が bg.canvas 上に置かれる前提。light は
 *    補助情報専用で本文転用は不可。検証は colorTokens.test.ts §"Issue #537")
 * - border.subtle × bg.canvas: light 3.49:1 / dark 6.18:1 (WCAG 1.4.11 非テキスト 3:1)
 */

// セクション最外枠。Index セクションと類似の見出し付きセクションだが、
// 上端に border.subtle の細い区切り線で雑誌の章間を意識させる。
const sectionStyles = css({
  display: "flex",
  flexDirection: "column",
  gap: "md",
  paddingTop: "lg",
  borderTop: "1px solid",
  borderTopColor: "border.subtle",
});

// セクション見出し ("過去の記事")。Index 見出しと同じスタイル語彙で並列にする。
// 補助情報のため fg.muted を採用 (Coordinate / Index 見出しと同じ語彙)。
// bg.canvas 上の補助情報として WCAG 1.4.3 AA (4.5:1) を満たす
// (実測 light 6.54:1 / dark 14.84:1。light は AAA 7:1 未達のため補助情報専用で
//  本文転用は不可。検証は colorTokens.test.ts §"Issue #537")。
const headingStyles = css({
  fontSize: "xs",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "fg.muted",
  marginBottom: "xs",
});

// 記事カード本体。BentoCard と同じ flat surface + subtle border + hover elevation
// を踏襲し、新着セクションとデザイン言語を共有する (= 別物に見えない、しかし
// セクション見出しで分離されている)。
//
// position:relative で stretched link (::after) のアンカーを兼ねる。
const cardStyles = css({
  position: "relative",
  display: "flex",
  flexDirection: "column",
  gap: "sm-md",
  background: "bg.surface",
  borderRadius: "lg",
  padding: "lg",
  border: "1px solid",
  borderColor: "border.subtle",
  transition: "transform 0.2s ease, box-shadow 0.2s ease",
  "&:hover": {
    transform: "translateY(-2px)",
    boxShadow: "card",
  },
  // hover 時にタイトル下線 (BentoCard と統一)
  "&:hover .resurface-title": {
    color: "accent.link",
    textDecoration: "underline",
    textDecorationThickness: "1px",
    textUnderlineOffset: "0.15em",
  },
});

// 文脈ラベル ("1 年前のあなたの声" 等)。FeaturedCard の "Featured" ラベルと
// 同じ語彙 (uppercase tracking) を低姿勢に流用しつつ、tabular-nums で年数の
// 桁ぞろえを確保する。
//
// Issue #492: 「投稿頻度の数値は出さない」「日数を出さない」を厳守。reason.kind と
// 年数 (年単位の文脈) のみを出し、N 日経過などの抽象指標は表示しない。
const reasonLabelStyles = css({
  display: "inline-block",
  fontSize: "xs",
  fontWeight: "700",
  textTransform: "uppercase",
  letterSpacing: "0.15em",
  color: "fg.secondary",
  fontVariantNumeric: "tabular-nums",
});

// 記事タイトル。BentoCard と同じ階層 (h3, lg→xl)。
const titleStyles = css({
  fontSize: "lg",
  fontWeight: "700",
  lineHeight: "snug",
  color: "fg.primary",
  marginBottom: "xs",
  transition: "color 0.2s ease",
  md: {
    fontSize: "xl",
  },
});

// excerpt (オプショナル)。BentoCard と同じ抑えた本文寄りトーン。
const excerptStyles = css({
  fontSize: "sm",
  lineHeight: "body",
  color: "fg.secondary",
});

// stretched link 用ラッパー (BentoCard の bentoStretchedLinkStyles と同パターン)。
// タイトルを包む Link の ::after で article 全体を覆い、行全体をクリック可能に
// しつつ a11y name はタイトルのみに絞る。focus ring は Link コンポーネント側で
// 既存 focusRingStyles (citrus 二重リング) が当たる。
const stretchedLinkStyles = css({
  position: "static",
  textDecoration: "none",
  "&::after": {
    content: '""',
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: "lg",
    background: "transparent",
  },
  // focus ring は Link 側で当たるが、stretched link の :focus-visible でも
  // article 全体に視覚的に乗るよう boxShadow を再掲する (BentoCard / IndexRow
  // と同パターン)。
  "&:focus-visible::after": {
    boxShadow: {
      _light:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-ink-900)",
      _dark:
        "0 0 0 2px var(--colors-focus-ring), 0 0 0 4px var(--colors-cream-50)",
    },
  },
});

// Issue #534: 表示文言テンプレート / 固定文言を定数として外出し。将来の i18n
// 化や文言調整の影響範囲をファイル内 1 箇所に局所化する。
// (i18n フレームワークは導入しない方針 — 単純な template リテラル / 文字列定数)
const RESURFACE_SECTION_HEADING = "過去の記事" as const;
const RESURFACE_SECTION_ARIA_LABEL = "過去の記事" as const;
const RESURFACE_UNTITLED_POST = "無題の記事" as const;
const RESURFACE_REASON_LABEL_SILENCE_YEAR_AGO = "1 年前のあなたの声" as const;
const RESURFACE_REASON_LABEL_SILENCE_OLDEST = "もう一度" as const;
const RESURFACE_REASON_LABEL_CALENDAR_TEMPLATE = (yearsAgo: number): string =>
  `${yearsAgo} 年前の今日`;
const RESURFACE_REASON_LABEL_MILESTONE_ANNIVERSARY_TEMPLATE = (
  label: string,
  yearsSinceMilestone: number,
): string => `${label}から ${yearsSinceMilestone} 年経った日`;

/**
 * reason に応じた文脈ラベル文字列を返す純粋関数。
 *
 * - Issue #492: 投稿頻度・間隔の数値は出さない。年単位のラベルのみ。
 * - silence/yearAgo は「1 年前のあなたの声」(過去の自分の声を差し出す表現)
 * - silence/oldest は「もう一度」(沈黙からの復帰時に最古記事を浮上)
 * - calendar は「N 年前の今日」(暦の偶然)
 * - milestoneAnniversary は「{label} から N 年経った日」(座標記念日)
 */
const buildReasonLabel = (reason: ResurfaceReason): string => {
  switch (reason.kind) {
    case "silence":
      return reason.sub === "yearAgo"
        ? RESURFACE_REASON_LABEL_SILENCE_YEAR_AGO
        : RESURFACE_REASON_LABEL_SILENCE_OLDEST;
    case "calendar":
      return RESURFACE_REASON_LABEL_CALENDAR_TEMPLATE(reason.yearsAgo);
    case "milestoneAnniversary":
      return RESURFACE_REASON_LABEL_MILESTONE_ANNIVERSARY_TEMPLATE(
        reason.label,
        reason.yearsSinceMilestone,
      );
  }
};

/**
 * Resurface コンポーネント本体。
 *
 * entry===null または show===false で何も描画しない (early return)。
 */
export const Resurface = memo(({ entry, show = true }: ResurfaceProps) => {
  if (!show || entry === null) {
    return null;
  }

  const { post, reason } = entry;
  const reasonLabel = buildReasonLabel(reason);

  // Hero morph (Issue #397): タイトル H3 に view-transition-name: post-{id} を
  // 付与し、記事詳細の H1 と morph させる。
  //
  // HomePage の Featured / Bento / Index にも同じ post.id があると DOM 内で
  // `view-transition-name: post-{id}` が複数宣言される。View Transitions API は
  // 同名 transition の重複を許容せず "Unexpected duplicate view-transition-name"
  // エラーで transition 全体を abort する (= 「最後の宣言が勝つ」ではない)。
  //
  // この衝突を回避するために、呼び出し側 (`pages/index.tsx`) で
  // `selectResurfaced(..., { excludeIds: posts.map(p => p.id) })` を渡し、
  // 現在ページに表示中の posts を Resurface 候補から強制的に除外している。
  // Resurface 側はこのガードを前提として viewTransitionName を素直に付与する。
  //
  // (newest = Featured が選ばれない件は selectResurfaced 内で pastCandidates =
  // resolved.slice(1) として既に除外済み。)
  const heroNameStyle: CSSProperties = {
    viewTransitionName: buildPostHeroTransitionName(String(post.id)),
  };

  return (
    <section
      className={sectionStyles}
      aria-labelledby="resurface-section-heading"
      aria-label={RESURFACE_SECTION_ARIA_LABEL}
    >
      <h3 id="resurface-section-heading" className={headingStyles}>
        {RESURFACE_SECTION_HEADING}
      </h3>
      <article
        className={cardStyles}
        data-token-border="border.subtle"
        data-token-bg="bg.surface"
      >
        <span className={reasonLabelStyles}>{reasonLabel}</span>
        <h3 className={`resurface-title ${titleStyles}`} style={heroNameStyle}>
          <Link
            to={`/posts/${post.id}`}
            variant="card"
            className={stretchedLinkStyles}
            viewTransition
          >
            {post.title || RESURFACE_UNTITLED_POST}
          </Link>
        </h3>
        {post.excerpt && <p className={excerptStyles}>{post.excerpt}</p>}
      </article>
    </section>
  );
});

Resurface.displayName = "Resurface";
