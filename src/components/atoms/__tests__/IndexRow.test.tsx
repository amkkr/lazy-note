import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { PostSummary } from "../../../lib/markdown";
import { IndexRow } from "../IndexRow";

const buildPost = (overrides: Partial<PostSummary> = {}): PostSummary => ({
  id: "idx-1",
  title: "Index 記事タイトル",
  createdAt: "2024-03-01",
  author: "佐藤次郎",
  excerpt: "Index 抜粋",
  readingTimeMinutes: 1,
  ...overrides,
});

describe("IndexRow", () => {
  it("タイトルが記事詳細ページへのリンクとして機能する", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost({ id: "idx-007" })} index={0} />
        </ul>
      </MemoryRouter>,
    );

    const link = screen.getByRole("link", { name: "Index 記事タイトル" });
    expect(link).toHaveAttribute("href", "/posts/idx-007");
  });

  it("index=0 の場合 zero-padded で 01 を表示できる", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost()} index={0} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("01")).toBeInTheDocument();
  });

  it("index=8 の場合 zero-padded で 09 を表示できる", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost()} index={8} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("09")).toBeInTheDocument();
  });

  it("index=99 の場合 100 を表示できる (3 桁化)", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost()} index={99} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("著者と日付を表示できる", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost()} index={0} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("佐藤次郎")).toBeInTheDocument();
    expect(screen.getByText("2024-03-01")).toBeInTheDocument();
  });

  it("Em ダッシュ区切りを描画する (UI 用絵文字を使わない)", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost()} index={0} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("タイトルが空の場合は「無題の記事」を表示する", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost({ title: "" })} index={0} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("無題の記事")).toBeInTheDocument();
  });

  it("著者が空の場合は「匿名」を表示する", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost({ author: "" })} index={0} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("匿名")).toBeInTheDocument();
  });

  it("日付が空の場合は「日付未設定」を表示する", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost({ createdAt: "" })} index={0} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByText("日付未設定")).toBeInTheDocument();
  });

  it("listitem 要素として描画される", () => {
    render(
      <MemoryRouter>
        <ul>
          <IndexRow post={buildPost()} index={0} />
        </ul>
      </MemoryRouter>,
    );

    expect(screen.getByRole("listitem")).toBeInTheDocument();
  });

  // ====================================================================
  // View Transitions Hero morph (Issue #397)
  // ====================================================================
  describe("View Transitions Hero morph", () => {
    it("タイトル要素に view-transition-name: post-{id} を付与する", () => {
      const { container } = render(
        <MemoryRouter>
          <ul>
            <IndexRow post={buildPost({ id: "idx-vt" })} index={0} />
          </ul>
        </MemoryRouter>,
      );

      // .index-row-title クラスを持つ span (タイトル wrapper) を取得
      const titleWrapper = container.querySelector(".index-row-title");
      expect(titleWrapper).not.toBeNull();
      expect((titleWrapper as HTMLElement).style.viewTransitionName).toBe(
        "post-idx-vt",
      );
    });
  });
});
