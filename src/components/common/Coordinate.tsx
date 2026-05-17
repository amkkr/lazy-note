import { memo } from "react";
import { css } from "../../../styled-system/css";
import {
  type Coordinate as CoordinateData,
  computeCoordinates,
  type Milestone,
} from "../../lib/anchors";

interface CoordinateProps {
  /**
   * 記事の公開日時 (ISO 8601 / JST 想定)。
   *
   * 親 (PostDetailPage) で `inferPublishedAt(post.id)` を呼び、null でない値を
   * 渡すこと。null や不正値は本コンポーネントの責務範囲外で、上位で弾く。
   *
   * publishedAt 以降 (未来) の節目は `computeCoordinates` 側で除外される。
   */
  publishedAt: string;
  /**
   * 表示対象の節目一覧。
   *
   * 親から明示的に渡す方針 (テストでの差し替えと撤退可能性の容易さを優先)。
   * 既定値は持たない (= 空配列を渡せば「座標 0 件」として非表示になる)。
   */
  milestones: readonly Milestone[];
  /**
   * 表示 OFF フラグ (撤退可能性 / epic #487)。
   *
   * Anchor 企画は「いつでも黙らせられる」ことを設計要件とする。Resurface と
   * 同じ命名 (`show` prop + 親側の `show*` 状態変数) で揃え、Coordinate を
   * 独立に OFF にできるようにする。既定 true。
   */
  show?: boolean;
}

/**
 * Coordinate — Anchor の3つの顔のひとつ「座標」(Issue #491 / epic #487)。
 *
 * 記事詳細ページの MetaInfo 近傍に、運営者の個人史座標
 * (「{label} から N 日目」) を **静かに** 一行で並べる。
 *
 * 設計の核 (epic #487 / Issue #491):
 * - 過去の節目のみ表示する (publishedAt 以降の節目は表示しない / `computeCoordinates`
 *   が filter で除外)
 * - **tone: "heavy" の節目は除外する** (重い節目は座標として静かに隠す)
 * - 座標 0 件のときコンポーネント自体を非表示にして空欄を作らない
 * - 表示 OFF フラグ (`show`) で独立に黙らせられる (Resurface と同じ命名)
 *
 * a11y:
 * - 内部の `<ul>` に `aria-label="個人史座標"` を付与し SR への意味付け
 *   (role=group は Biome a11y/useSemanticElements で fieldset 推奨警告となるため
 *    list role を持つ ul に直接ラベルする方式を採る)
 * - `<ul>` に `role="list"` を明示する。`list-style: none` を当てた ul は
 *   Safari/VoiceOver で list セマンティクスが剥奪される既知の WebKit バグへの防御
 * - `<ul>/<li>` のリスト構造で項目ナビゲーションを許容
 * - 色は `fg.muted` (補助情報) を採用。`bg.surface` 上に置かれる前提で
 *   1.4.3 / 1.4.6 の本文比 4.5:1 / 7:1 を満たす Editorial Citrus トークン
 *
 * 撤退可能性:
 * - `show={false}` で個別に OFF にできる
 * - milestones を空配列で渡せば座標が消える (= 表示 0 件で自動非表示)
 * - milestones.json を空にすれば全記事から座標が消える
 *
 * デザイン語彙:
 * - MetaInfo の card variant と同じ `fg.muted` (補助情報トーン)
 * - 区切り文字「・」で複数の座標を一行に並べる (中点は Editorial 日本語慣行)
 * - `fontVariantNumeric: tabular-nums` で日数 (N) の桁ぞろえ
 */

const containerStyles = css({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "xs",
  marginTop: "sm",
  // 補助情報のため fg.muted を採用 (MetaInfo card variant と同じ語彙)。
  // bg.surface 上の補助情報として WCAG 1.4.3 (4.5:1) / 1.4.6 (7:1) を満たす。
  color: "fg.muted",
  fontSize: "xs",
  lineHeight: "snug",
  // 日数 (N) の桁ぞろえに使う (Resurface / IndexRow 等と同じ語彙)。
  fontVariantNumeric: "tabular-nums",
  // 内部の ul / li のデフォルト marker / padding を除去し、一行に並べる
  "& ul": {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: "xs",
    listStyle: "none",
    margin: 0,
    padding: 0,
  },
  "& li": {
    display: "inline-flex",
    alignItems: "center",
  },
});

// 区切り文字「・」のスタイル。aria-hidden で SR からは隠す
// (項目区切りは ul/li 構造で SR に伝わるため、視覚装飾のみ)。
//
// Issue #536: 色は wrapper (containerStyles) の `color: "fg.muted"` を CSS の
// 継承で受け取り、ここでは独自宣言しない。separator に同じ token を重複宣言
// すると Tripwire 網漏れ (wrapper だけ検証されるため separator の color を
// 別 token に差し替えても気付けない) を構造的に生むため、宣言自体を撤去して
// 「色は wrapper 1 箇所」に統一する (案 B: 構造的解決)。
const separatorStyles = css({
  marginInline: "xs",
});

/**
 * 座標1件の表示文言を構築する純粋関数。
 *
 * Issue #491: 「{label} から N 日目」固定。0 日目 (節目当日に書かれた記事)
 * も同じ書式で表示する。
 */
const buildCoordinateLabel = (coordinate: CoordinateData): string => {
  return `${coordinate.label} から ${coordinate.daysSince} 日目`;
};

/**
 * Coordinate コンポーネント本体。
 *
 * - show=false または座標 0 件で何も描画しない (early return)
 * - 描画時は `<ul role="list" aria-label="個人史座標">` でラベル付きリストとして
 *   意味付けし、外側を `<div data-token-color="fg.muted">` (Tripwire 用 wrapper)
 *   で wrap する
 */
export const Coordinate = memo(
  ({ publishedAt, milestones, show = true }: CoordinateProps) => {
    if (!show) {
      return null;
    }

    // 過去の節目に絞った座標 (computeCoordinates が未来は除外する)
    const coordinates = computeCoordinates(publishedAt, milestones);
    // `heavy` を除外して表示候補に絞る。
    // `Coordinate` は現状単型のため `kind` 判定は型レベルで tautology だが、
    // 将来 `Coordinate | Elapsed` mixed union に拡張された際の narrowing 防御として
    // 型ガード形式を採用する (Issue #497 の discriminator 設計意図に対応)。
    const displayable = coordinates.filter(
      (c): c is CoordinateData =>
        c.kind === "coordinate" && c.tone !== "heavy",
    );

    if (displayable.length === 0) {
      return null;
    }

    return (
      <div className={containerStyles} data-token-color="fg.muted">
        {/* biome-ignore lint/a11y/noRedundantRoles: Safari/VoiceOver で list-style: none を当てた ul の list セマンティクスが剥奪される既知の WebKit バグへの防御として role="list" を明示する */}
        <ul aria-label="個人史座標" role="list">
          {displayable.map((coordinate, index) => (
            // milestones.json に同じ label が誤って 2 行入っても React の
            // duplicate key warning を起こさないよう、label と daysSince を
            // 組み合わせた複合キーを採用する (DA Round 1 推奨修正)。
            <li key={`${coordinate.label}-${coordinate.daysSince}`}>
              {index > 0 && (
                <span aria-hidden="true" className={separatorStyles}>
                  ・
                </span>
              )}
              <span>{buildCoordinateLabel(coordinate)}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  },
);

Coordinate.displayName = "Coordinate";
