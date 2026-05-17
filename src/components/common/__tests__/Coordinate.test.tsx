import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, expect, it } from "vitest";
import type { Milestone } from "../../../lib/anchors";
import { buildPulseForbiddenVocabRegex } from "../../../test/forbiddenVocab";
import { Coordinate } from "../Coordinate";

/**
 * テスト用節目データ。
 *
 * - neutral / light / heavy の各 tone を1件ずつ含める
 * - 日付は publishedAt との差分を意図的にコントロールできるよう設定
 */
const baseMilestones: readonly Milestone[] = [
  { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
  { date: "2025-02-01", label: "社会復帰", tone: "light" },
  { date: "2025-03-01", label: "休職開始", tone: "heavy" },
];

describe("Coordinate", () => {
  describe("撤退可能性 / 非表示判定", () => {
    it("座標0件のとき何も描画しない (空欄を作らない)", () => {
      const { container } = render(
        <Coordinate
          publishedAt="2024-12-31T00:00:00+09:00"
          milestones={baseMilestones}
        />,
      );

      // 全節目が publishedAt より未来のため、表示対象0件で何も描画しない
      expect(container.firstChild).toBeNull();
    });

    it("milestones が空配列のとき何も描画しない", () => {
      const { container } = render(
        <Coordinate publishedAt="2026-01-01T00:00:00+09:00" milestones={[]} />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("show=false のとき何も描画しない (表示 OFF フラグ)", () => {
      const { container } = render(
        <Coordinate
          publishedAt="2026-01-01T00:00:00+09:00"
          milestones={baseMilestones}
          show={false}
        />,
      );

      expect(container.firstChild).toBeNull();
    });

    it("show を省略すると既定で true として扱われ通常表示される", () => {
      render(
        <Coordinate
          publishedAt="2026-01-01T00:00:00+09:00"
          milestones={baseMilestones}
        />,
      );

      // region が描画されていること
      expect(
        screen.getByRole("list", { name: "個人史座標" }),
      ).toBeInTheDocument();
    });
  });

  describe("節目フィルタの責務", () => {
    it("publishedAt 以降の節目は表示しない (過去の節目のみ)", () => {
      // 2025-01-15 公開: サイト開設 (2025-01-01) のみ過去、他2件は未来
      render(
        <Coordinate
          publishedAt="2025-01-15T00:00:00+09:00"
          milestones={baseMilestones}
        />,
      );

      // 過去の節目のみ表示
      expect(screen.getByText(/サイト開設/)).toBeInTheDocument();
      // 未来の節目 (社会復帰: 2025-02-01, 休職開始: 2025-03-01) は表示しない
      expect(screen.queryByText(/社会復帰/)).not.toBeInTheDocument();
      expect(screen.queryByText(/休職開始/)).not.toBeInTheDocument();
    });

    it("tone: heavy の節目は Coordinate に表示しない (重い節目は静かに隠す)", () => {
      // 2026-01-01 公開: 3件全てが過去だが、heavy (休職開始) は除外される
      render(
        <Coordinate
          publishedAt="2026-01-01T00:00:00+09:00"
          milestones={baseMilestones}
        />,
      );

      expect(screen.getByText(/サイト開設/)).toBeInTheDocument();
      expect(screen.getByText(/社会復帰/)).toBeInTheDocument();
      expect(screen.queryByText(/休職開始/)).not.toBeInTheDocument();
    });

    it("publishedAt 当日の節目 (差分0日) は表示する (境界値: 0 日目)", () => {
      // 節目当日に書かれた記事 → 0 日目として表示する
      render(
        <Coordinate
          publishedAt="2025-01-01T12:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
          ]}
        />,
      );

      expect(screen.getByText(/サイト開設/)).toBeInTheDocument();
      expect(screen.getByText(/0\s*日目/)).toBeInTheDocument();
    });

    it("過去のみで heavy も無い場合に全件表示される (フィルタの取りこぼし防止)", () => {
      render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
            { date: "2025-02-01", label: "社会復帰", tone: "light" },
          ]}
        />,
      );

      expect(screen.getByText(/サイト開設/)).toBeInTheDocument();
      expect(screen.getByText(/社会復帰/)).toBeInTheDocument();
    });
  });

  describe("表示内容と日数計算", () => {
    it("「{label} から N 日目」の文言で表示される", () => {
      // 2025-01-01 → 2025-01-11 で 10 日差
      render(
        <Coordinate
          publishedAt="2025-01-11T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
          ]}
        />,
      );

      expect(
        screen.getByText(/サイト開設\s*から\s*10\s*日目/),
      ).toBeInTheDocument();
    });

    it("複数の座標を「・」区切りの一行で並べる", () => {
      // 2025-01-01 (サイト開設, neutral) と 2025-02-01 (社会復帰, light) を
      // 2025-12-31 公開記事から見るとそれぞれ 364 日目 / 333 日目
      render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
            { date: "2025-02-01", label: "社会復帰", tone: "light" },
          ]}
        />,
      );

      const group = screen.getByRole("list", { name: "個人史座標" });
      expect(group.textContent).toContain("サイト開設");
      expect(group.textContent).toContain("364");
      expect(group.textContent).toContain("社会復帰");
      expect(group.textContent).toContain("333");
      // 区切り文字「・」が間に存在する
      expect(group.textContent).toMatch(/・/);
    });
  });

  describe("過剰可視化の禁止 (Pulse 思想)", () => {
    it("Pulse 思想禁則語彙 (投稿頻度 / 執筆ペース 等) が座標 UI に現れない", () => {
      // 語彙の網羅は src/test/forbiddenVocab.ts に集約してあり、
      // Resurface / AnchorPage / HomePage と共通の禁則語彙集を参照する
      // (Issue #540)。Coordinate は「{label} から N 日目」の最小表現のみで
      // 抽象指標語彙を一切吐かない構造を Tripwire で保証する。
      const { container } = render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
            { date: "2025-02-01", label: "社会復帰", tone: "light" },
          ]}
        />,
      );

      const text = container.textContent ?? "";
      expect(text).not.toMatch(buildPulseForbiddenVocabRegex());
    });
  });

  describe("a11y / 意味的構造", () => {
    it("ul に aria-label='個人史座標' を付与し SR にラベルを伝える", () => {
      render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
          ]}
        />,
      );

      expect(
        screen.getByRole("list", { name: "個人史座標" }),
      ).toBeInTheDocument();
    });

    it("ul に role='list' を明示し Safari/VoiceOver の list セマンティクス剥奪を防ぐ", () => {
      const { container } = render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
          ]}
        />,
      );

      // list-style: none を当てた ul は Safari/VoiceOver で list セマンティクスが
      // 剥奪される既知の WebKit バグへの防御として role='list' を明示する
      const ul = container.querySelector("ul");
      expect(ul).not.toBeNull();
      expect(ul).toHaveAttribute("role", "list");
    });

    it("リスト構造 (ul/li) で座標群を並べる (SR の項目ナビゲーション)", () => {
      render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
            { date: "2025-02-01", label: "社会復帰", tone: "light" },
          ]}
        />,
      );

      const list = screen.getByRole("list");
      // 座標2件が li 要素として並ぶ
      expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    });
  });

  describe("Panda token 適用 (Tripwire)", () => {
    it("コンテナ (ul の親要素) が fg.muted を data-token-color 属性で宣言する", () => {
      const { container } = render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
          ]}
        />,
      );

      // ul の親 div に data-token-color="fg.muted" が宣言される
      const wrapper = container.querySelector('[data-token-color="fg.muted"]');
      expect(wrapper).not.toBeNull();
      // ul の親要素であることを確認 (Coordinate の wrapper は ul を内包する)
      expect(wrapper?.querySelector("ul")).not.toBeNull();
    });

    // Issue #536 (案 B): separator span は独自の color 宣言を持たず、wrapper の
    // `color: "fg.muted"` を CSS の継承で受け取る構造に統一する。重複宣言を
    // 撤去することで「wrapper だけ Tripwire 検証されて separator の color 差し替えに
    // 気付けない」網漏れを**構造的に**解消する (案 A の二重 data-token-color 化より
    // CSS が 1 行減り、宣言箇所が 1 箇所に集約される)。
    //
    // 本テストは separator が独自 `data-token-color` を吐かないこと (= 色は wrapper の
    // 1 箇所のみで宣言される) を Tripwire 属性レベルで保証する。
    it("separator span は独自の data-token-color を吐かず wrapper の色を継承する (Issue #536 案 B)", () => {
      // 座標 2 件以上で separator span が描画される (index > 0 のときのみ描画)
      const { container } = render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
            { date: "2025-02-01", label: "社会復帰", tone: "light" },
          ]}
        />,
      );

      // separator span (aria-hidden="true" を持つ span) を取得
      const separators = container.querySelectorAll('span[aria-hidden="true"]');
      // 2 件の座標があるので separator は 1 件描画される (index === 0 のときは出ない)
      expect(separators).toHaveLength(1);

      const separator = separators[0];
      // 独自の data-token-color 属性を持たない (色は wrapper から継承)
      expect(separator).not.toHaveAttribute("data-token-color");
      // 表示文字は中点「・」
      expect(separator?.textContent).toBe("・");
    });

    // Issue #536: 色の宣言箇所が wrapper の 1 箇所のみであることを Tripwire 網
    // 全体で保証する (= ドキュメント全体に `data-token-color="fg.muted"` を持つ
    // 要素は wrapper の 1 件しか存在しない)。separator や個別 li に同じ token
    // を重複宣言したくなった場合のレビュー観点として機能する。
    it("Coordinate 全体で data-token-color='fg.muted' を吐く要素は wrapper の 1 件のみ", () => {
      const { container } = render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
            { date: "2025-02-01", label: "社会復帰", tone: "light" },
          ]}
        />,
      );

      const tokenColorNodes = container.querySelectorAll(
        '[data-token-color="fg.muted"]',
      );
      expect(tokenColorNodes).toHaveLength(1);
    });
  });

  // ==========================================================================
  // axe a11y 違反検証 (Issue #491 AC: 「axe で新規違反が出ないこと」)
  //
  // jest-axe を Vitest + jsdom で利用し、Coordinate の描画結果に axe-core の
  // 検出する a11y 違反が含まれないことを保証する。Tripwire テストでは
  // 拾い切れない自動検証可能な a11y ルール (role / label / コントラスト等の
  // axe ルール群) のセーフティネットとして機能する。
  // ==========================================================================
  describe("axe a11y 違反検証", () => {
    it("座標を描画した状態で axe a11y 違反が 0 件である", async () => {
      const { container } = render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
            { date: "2025-02-01", label: "社会復帰", tone: "light" },
          ]}
        />,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });
});
