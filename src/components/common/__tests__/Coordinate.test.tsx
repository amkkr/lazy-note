import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Milestone } from "../../../lib/anchors";
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
        <Coordinate
          publishedAt="2026-01-01T00:00:00+09:00"
          milestones={[]}
        />,
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
        screen.getByRole("list", { name: "あれから N 日目" }),
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

      const group = screen.getByRole("list", { name: "あれから N 日目" });
      expect(group.textContent).toContain("サイト開設");
      expect(group.textContent).toContain("364");
      expect(group.textContent).toContain("社会復帰");
      expect(group.textContent).toContain("333");
      // 区切り文字「・」が間に存在する
      expect(group.textContent).toMatch(/・/);
    });
  });

  describe("a11y / 意味的構造", () => {
    it("ul に aria-label='あれから N 日目' を付与し SR にラベルを伝える", () => {
      render(
        <Coordinate
          publishedAt="2025-12-31T00:00:00+09:00"
          milestones={[
            { date: "2025-01-01", label: "サイト開設", tone: "neutral" },
          ]}
        />,
      );

      expect(
        screen.getByRole("list", { name: "あれから N 日目" }),
      ).toBeInTheDocument();
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
      const wrapper = container.querySelector(
        '[data-token-color="fg.muted"]',
      );
      expect(wrapper).not.toBeNull();
      // ul の親要素であることを確認 (Coordinate の wrapper は ul を内包する)
      expect(wrapper?.querySelector("ul")).not.toBeNull();
    });
  });
});
