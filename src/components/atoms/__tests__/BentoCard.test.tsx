import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PostSummary } from "../../../lib/markdown";
import { BentoCard } from "../BentoCard";

const buildPost = (overrides: Partial<PostSummary> = {}): PostSummary => ({
  id: "bento-1",
  title: "Bento 記事タイトル",
  createdAt: "2024-02-01",
  author: "田中太郎",
  excerpt: "Bento 記事の抜粋",
  readingTimeMinutes: 2,
  ...overrides,
});

describe("BentoCard", () => {
  it("タイトルを H3 として表示できる", () => {
    render(
      <MemoryRouter>
        <BentoCard post={buildPost()} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: "Bento 記事タイトル", level: 3 }),
    ).toBeInTheDocument();
  });

  it("タイトルが記事詳細ページへのリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <BentoCard post={buildPost({ id: "bento-99" })} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Bento 記事タイトル" });
    expect(link).toHaveAttribute("href", "/posts/bento-99");
  });

  it("excerpt を表示できる", () => {
    render(
      <MemoryRouter>
        <BentoCard post={buildPost({ excerpt: "Bento 抜粋テスト" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Bento 抜粋テスト")).toBeInTheDocument();
  });

  it("excerpt が空の場合は表示されない", () => {
    const { container } = render(
      <MemoryRouter>
        <BentoCard post={buildPost({ excerpt: "" })} />
      </MemoryRouter>,
    );

    const paragraph = container.querySelector("article p");
    expect(paragraph).toBeNull();
  });

  it("メタ情報を bento variant で表示できる", () => {
    render(
      <MemoryRouter>
        <BentoCard post={buildPost()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("2024-02-01")).toBeInTheDocument();
    expect(screen.getByText("田中太郎")).toBeInTheDocument();
    expect(screen.getByText("2分で読了")).toBeInTheDocument();
  });

  it("タイトルが空の場合は「無題の記事」を表示する", () => {
    render(
      <MemoryRouter>
        <BentoCard post={buildPost({ title: "" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("無題の記事")).toBeInTheDocument();
  });

  it("size=tall は grid-row span 2 のクラスを持つ", () => {
    // Panda CSS は grid-row を grid-r に短縮するため lg:grid-r_span_2 で検証
    const { container } = render(
      <MemoryRouter>
        <BentoCard post={buildPost()} size="tall" />
      </MemoryRouter>,
    );

    const article = container.querySelector("article");
    expect(article?.className).toMatch(/lg:grid-r_span_2/);
  });

  it("size=wide は grid-column span 2 のクラスを持つ", () => {
    // Panda CSS は grid-column を grid-c に短縮するため lg:grid-c_span_2 で検証
    const { container } = render(
      <MemoryRouter>
        <BentoCard post={buildPost()} size="wide" />
      </MemoryRouter>,
    );

    const article = container.querySelector("article");
    expect(article?.className).toMatch(/lg:grid-c_span_2/);
  });

  it("size=default では grid span クラスを持たない", () => {
    const { container } = render(
      <MemoryRouter>
        <BentoCard post={buildPost()} size="default" />
      </MemoryRouter>,
    );

    const article = container.querySelector("article");
    expect(article?.className).not.toMatch(/lg:grid-r_span_2/);
    expect(article?.className).not.toMatch(/lg:grid-c_span_2/);
  });

  it("article 要素として描画される", () => {
    render(
      <MemoryRouter>
        <BentoCard post={buildPost()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  // ====================================================================
  // View Transitions Hero morph (Issue #397)
  // ====================================================================
  describe("View Transitions Hero morph", () => {
    it("タイトル H3 に view-transition-name: post-{id} を付与する", () => {
      render(
        <MemoryRouter>
          <BentoCard post={buildPost({ id: "bento-vt" })} />
        </MemoryRouter>,
      );

      const heading = screen.getByRole("heading", {
        name: "Bento 記事タイトル",
        level: 3,
      });
      expect(heading.style.viewTransitionName).toBe("post-bento-vt");
    });
  });

  // Issue #445 / Issue #422: 旧 token (bg.elevated) は light 環境で外側
  // bg.canvas との差が 1.06:1 となり border が視覚消失していた。border 専用
  // token (border.subtle) を参照していることを `data-token-border` 意味属性で
  // 検証する (Panda `hash: true` 耐性、Option A)。
  it("article は border.subtle 専用 token を border として宣言する", () => {
    const { container } = render(
      <MemoryRouter>
        <BentoCard post={buildPost()} />
      </MemoryRouter>,
    );

    const article = container.querySelector("article");
    expect(article).toBeInTheDocument();
    expect(article).toHaveAttribute("data-token-border", "border.subtle");
  });
});
