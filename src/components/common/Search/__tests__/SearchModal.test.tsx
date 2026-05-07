import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchModal } from "../SearchModal";

const sampleIndex = [
  {
    id: "20250101120000",
    title: "TypeScript で型安全に書く",
    excerpt: "TypeScript の型システムを活用して安全に書く方法",
    tags: ["typescript", "design"],
    publishedAt: "2025-01-01T12:00:00+09:00",
  },
  {
    id: "20250505010000",
    title: "Panda CSS 入門",
    excerpt: "Panda CSS を使った型安全なスタイリング",
    tags: ["css", "panda"],
    publishedAt: "2025-05-05T01:00:00+09:00",
  },
  {
    id: "20240601000000",
    title: "ジオングと宇宙世紀",
    excerpt: "ガンプラを組んでガンベに行った話",
    tags: ["hobby"],
    publishedAt: "2024-06-01T00:00:00+09:00",
  },
];

const renderModal = (onClose: () => void = vi.fn()) =>
  render(
    <MemoryRouter>
      <SearchModal isOpen={true} onClose={onClose} />
    </MemoryRouter>,
  );

describe("SearchModal", () => {
  beforeEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (globalThis as any).fetch = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
        json: async () => sampleIndex as any,
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      } as any),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("ダイアログとして表示される", async () => {
    renderModal();
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("searchbox", { name: "検索キーワード" }),
    ).toBeInTheDocument();
  });

  it("インデックス読み込み完了後に件数を案内する", async () => {
    renderModal();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "3 件の記事から検索できます",
      );
    });
  });

  it("クエリ入力でタイトル一致の結果を表示できる", async () => {
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "件の記事から検索できます",
      );
    });
    await user.type(
      screen.getByRole("searchbox", { name: "検索キーワード" }),
      "TypeScript",
    );
    await waitFor(() => {
      expect(screen.getByText("TypeScript で型安全に書く")).toBeInTheDocument();
    });
  });

  it("該当が無い場合は0件ヒットになる", async () => {
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "件の記事から検索できます",
      );
    });
    await user.type(
      screen.getByRole("searchbox", { name: "検索キーワード" }),
      "存在しないキーワードxyzzz",
    );
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("0 件ヒット");
    });
  });

  it("閉じるボタンでonCloseが呼ばれる", async () => {
    const handleClose = vi.fn();
    const user = userEvent.setup();
    renderModal(handleClose);
    await screen.findByRole("dialog");
    await user.click(screen.getByRole("button", { name: "検索を閉じる" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("矢印キーで結果リストにフォーカスを移動できる", async () => {
    const user = userEvent.setup();
    renderModal();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "件の記事から検索できます",
      );
    });
    const input = screen.getByRole("searchbox", { name: "検索キーワード" });
    await user.type(input, "panda");
    await waitFor(() => {
      expect(screen.getByText("Panda CSS 入門")).toBeInTheDocument();
    });
    input.focus();
    await user.keyboard("{ArrowDown}");
    expect(document.activeElement?.tagName).toBe("BUTTON");
    expect(document.activeElement).toHaveAttribute("data-search-result");
  });

  it("インデックス読み込み失敗時にエラーメッセージを表示する", async () => {
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (globalThis as any).fetch = vi.fn(async () =>
      ({
        ok: false,
        status: 500,
        // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
        json: async () => [] as any,
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      } as any),
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    renderModal();
    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(
        "検索インデックスを読み込めませんでした",
      );
    });
    consoleSpy.mockRestore();
  });
});
