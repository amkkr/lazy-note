import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PostSummary } from "../../../lib/markdown";
import type { ResurfacedEntry } from "../../../lib/resurface";
import { buildPulseForbiddenVocabRegex } from "../../../test/forbiddenVocab";
import { Resurface } from "../Resurface";

const buildPost = (overrides: Partial<PostSummary> = {}): PostSummary => ({
  id: "20250101120000",
  title: "過去のテスト記事",
  createdAt: "2025/01/01 12:00",
  author: "amkkr",
  excerpt: "過去の自分の声",
  readingTimeMinutes: 3,
  ...overrides,
});

const buildEntry = (
  overrides: Partial<ResurfacedEntry> = {},
): ResurfacedEntry => ({
  post: buildPost(),
  reason: { kind: "silence", lastPostDaysAgo: 45, sub: "yearAgo" },
  ...overrides,
});

describe("Resurface", () => {
  describe("撤退可能性 / 非表示判定", () => {
    it("entry が null のとき何も描画しない (スロット非表示)", () => {
      const { container } = render(
        <MemoryRouter>
          <Resurface entry={null} />
        </MemoryRouter>,
      );

      // section / heading / link のいずれも描画されない
      expect(container.firstChild).toBeNull();
    });

    it("show=false のとき何も描画しない (表示 OFF フラグ)", () => {
      const { container } = render(
        <MemoryRouter>
          <Resurface entry={buildEntry()} show={false} />
        </MemoryRouter>,
      );

      expect(container.firstChild).toBeNull();
    });

    it("show を省略すると既定で true として扱われる (= 通常表示される)", () => {
      render(
        <MemoryRouter>
          <Resurface entry={buildEntry()} />
        </MemoryRouter>,
      );

      // section が描画されていること
      expect(
        screen.getByRole("region", { name: "過去の記事" }),
      ).toBeInTheDocument();
    });
  });

  describe("正常表示", () => {
    it("浮上記事のタイトルを表示し、記事詳細へのリンクにできる", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              post: buildPost({
                id: "20240101120000",
                title: "再浮上タイトル",
              }),
            })}
          />
        </MemoryRouter>,
      );

      const link = screen.getByRole("link", { name: "再浮上タイトル" });
      expect(link).toHaveAttribute("href", "/posts/20240101120000");
    });

    it("excerpt がある場合は本文プレビューとして表示される", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              post: buildPost({ excerpt: "過去の自分の声・抜粋" }),
            })}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("過去の自分の声・抜粋")).toBeInTheDocument();
    });
  });

  describe("a11y / 意味的分離", () => {
    it("section に role=region と aria-label='過去の記事' を持ち、新着セクションと意味的に区別できる", () => {
      render(
        <MemoryRouter>
          <Resurface entry={buildEntry()} />
        </MemoryRouter>,
      );

      const region = screen.getByRole("region", { name: "過去の記事" });
      expect(region).toBeInTheDocument();
    });

    it("見出しは h3 で Index と並列 (h2 逆転を避ける)", () => {
      render(
        <MemoryRouter>
          <Resurface entry={buildEntry()} />
        </MemoryRouter>,
      );

      // 見出し階層: HomePage h2 (Featured) → BentoCard/Index h3 → Resurface h3
      expect(
        screen.getByRole("heading", { name: "過去の記事", level: 3 }),
      ).toBeInTheDocument();
    });

    it("border は border.subtle 専用 token を data-token-border 属性で宣言する (Tripwire)", () => {
      const { container } = render(
        <MemoryRouter>
          <Resurface entry={buildEntry()} />
        </MemoryRouter>,
      );

      const article = container.querySelector("article");
      expect(article).toHaveAttribute("data-token-border", "border.subtle");
    });
  });

  describe("文脈ラベル (reason に応じた静かな付与)", () => {
    it("reason.kind=silence かつ sub=yearAgo のとき「1 年前のあなたの声」ラベルを付与する", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              reason: {
                kind: "silence",
                lastPostDaysAgo: 45,
                sub: "yearAgo",
              },
            })}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("1 年前のあなたの声")).toBeInTheDocument();
    });

    it("reason.kind=silence かつ sub=oldest のとき「もう一度」ラベルを付与する", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              reason: {
                kind: "silence",
                lastPostDaysAgo: 60,
                sub: "oldest",
              },
            })}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("もう一度")).toBeInTheDocument();
    });

    it("reason.kind=calendar (yearsAgo=1) のとき「1 年前の今日」ラベルを付与する", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              reason: { kind: "calendar", yearsAgo: 1 },
            })}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("1 年前の今日")).toBeInTheDocument();
    });

    it("reason.kind=calendar (yearsAgo=2) のとき「2 年前の今日」ラベルを付与する", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              reason: { kind: "calendar", yearsAgo: 2 },
            })}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("2 年前の今日")).toBeInTheDocument();
    });

    it("reason.kind=milestoneAnniversary のとき「{label} から {N} 年経った日」ラベルを付与する", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              reason: {
                kind: "milestoneAnniversary",
                label: "社会復帰",
                yearsSinceMilestone: 1,
              },
            })}
          />
        </MemoryRouter>,
      );

      expect(screen.getByText("社会復帰から 1 年経った日")).toBeInTheDocument();
    });
  });

  describe("投稿頻度・投稿間隔の数値は一切表示しない (Pulse 思想)", () => {
    /**
     * Pulse (頻度可視化) を切った思想を厳守するため、UI に「N 日ぶり」「投稿間隔」
     * 「N 日経過」などの数値表現を出してはならない。
     */
    it("reason.kind=silence の lastPostDaysAgo (60 日経過) が UI 上に出ない", () => {
      render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              reason: {
                kind: "silence",
                lastPostDaysAgo: 60,
                sub: "yearAgo",
              },
            })}
          />
        </MemoryRouter>,
      );

      // "60" という数値はどこにも表示されていない
      expect(screen.queryByText(/60/)).not.toBeInTheDocument();
      // 「日ぶり」「日経過」「投稿間隔」も表示されない
      expect(screen.queryByText(/日ぶり/)).not.toBeInTheDocument();
      expect(screen.queryByText(/日経過/)).not.toBeInTheDocument();
      expect(screen.queryByText(/投稿間隔/)).not.toBeInTheDocument();
      expect(screen.queryByText(/頻度/)).not.toBeInTheDocument();
    });

    it("Pulse 思想禁則語彙 (投稿頻度 / 執筆ペース 等) が UI 上に現れない", () => {
      // 語彙の網羅は src/test/forbiddenVocab.ts に集約してあり、
      // Coordinate / AnchorPage / HomePage と共通の禁則語彙集を参照する
      // (Issue #540)。Resurface は silence reason の数値ガードと併せて
      // 抽象指標語彙でも防御する。
      const { container } = render(
        <MemoryRouter>
          <Resurface
            entry={buildEntry({
              reason: {
                kind: "silence",
                lastPostDaysAgo: 60,
                sub: "yearAgo",
              },
            })}
          />
        </MemoryRouter>,
      );

      const text = container.textContent ?? "";
      expect(text).not.toMatch(buildPulseForbiddenVocabRegex());
    });
  });

  describe("キーボード操作 / focus ring", () => {
    it("記事タイトルのリンクには既存パターンの focus ring が当たる (data-focus-ring=default)", () => {
      render(
        <MemoryRouter>
          <Resurface entry={buildEntry()} />
        </MemoryRouter>,
      );

      // Link コンポーネント (variant=card) が data-focus-ring="default" を吐く
      const link = screen.getByRole("link", { name: "過去のテスト記事" });
      expect(link).toHaveAttribute("data-focus-ring", "default");
    });
  });
});
