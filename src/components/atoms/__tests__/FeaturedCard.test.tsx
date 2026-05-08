import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PostSummary } from "../../../lib/markdown";
import { FeaturedCard } from "../FeaturedCard";

const buildPost = (overrides: Partial<PostSummary> = {}): PostSummary => ({
  id: "feat-1",
  title: "Featured 記事のタイトル",
  createdAt: "2024-01-01",
  author: "山田花子",
  excerpt: "Featured 記事の抜粋",
  readingTimeMinutes: 5,
  ...overrides,
});

describe("FeaturedCard", () => {
  it("Featured ラベルを表示できる", () => {
    render(
      <MemoryRouter>
        <FeaturedCard post={buildPost()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("Featured")).toBeInTheDocument();
  });

  it("タイトルを H2 として表示できる", () => {
    render(
      <MemoryRouter>
        <FeaturedCard post={buildPost()} />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", {
        name: "Featured 記事のタイトル",
        level: 2,
      }),
    ).toBeInTheDocument();
  });

  it("タイトルが記事詳細ページへのリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <FeaturedCard post={buildPost({ id: "feat-42" })} />
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", {
      name: "Featured 記事のタイトル",
    });
    expect(link).toHaveAttribute("href", "/posts/feat-42");
  });

  it("excerpt をサブヘッドとして表示できる", () => {
    render(
      <MemoryRouter>
        <FeaturedCard post={buildPost({ excerpt: "サブヘッドのテキスト" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("サブヘッドのテキスト")).toBeInTheDocument();
  });

  it("excerpt が空の場合はサブヘッドが描画されない", () => {
    const { container } = render(
      <MemoryRouter>
        <FeaturedCard post={buildPost({ excerpt: "" })} />
      </MemoryRouter>,
    );

    // article 直下に <p> が存在しないことで excerpt 非表示を確認
    const paragraph = container.querySelector("article > p");
    expect(paragraph).toBeNull();
  });

  it("メタ情報 (日付・著者・読了時間) を表示できる", () => {
    render(
      <MemoryRouter>
        <FeaturedCard post={buildPost()} />
      </MemoryRouter>,
    );

    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("山田花子")).toBeInTheDocument();
    expect(screen.getByText("5分で読了")).toBeInTheDocument();
  });

  it("タイトルが空の場合は「無題の記事」を表示する", () => {
    render(
      <MemoryRouter>
        <FeaturedCard post={buildPost({ title: "" })} />
      </MemoryRouter>,
    );

    expect(screen.getByText("無題の記事")).toBeInTheDocument();
  });

  it("article 要素として描画される", () => {
    render(
      <MemoryRouter>
        <FeaturedCard post={buildPost()} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("article")).toBeInTheDocument();
  });

  // ====================================================================
  // View Transitions Hero morph (Issue #397)
  //
  // タイトル H2 に `view-transition-name: post-{id}` のインラインスタイルが
  // 付与されており、PostDetailPage の H1 と同じ name で morph が成立する
  // ことを検証する。
  // ====================================================================
  describe("View Transitions Hero morph", () => {
    it("タイトル H2 に view-transition-name: post-{id} を付与する", () => {
      render(
        <MemoryRouter>
          <FeaturedCard post={buildPost({ id: "feat-vt" })} />
        </MemoryRouter>,
      );

      const heading = screen.getByRole("heading", {
        name: "Featured 記事のタイトル",
        level: 2,
      });
      expect(heading.style.viewTransitionName).toBe("post-feat-vt");
    });
  });
});
