import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchTrigger } from "../SearchTrigger";

const renderTrigger = () =>
  render(
    <MemoryRouter>
      <SearchTrigger />
    </MemoryRouter>,
  );

describe("SearchTrigger", () => {
  beforeEach(() => {
    // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
    (globalThis as any).fetch = vi.fn(async () =>
      ({
        ok: true,
        status: 200,
        // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
        json: async () => [] as any,
      // biome-ignore lint/suspicious/noExplicitAny: テストファイルでのモックのため許可
      } as any),
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("検索ボタンが表示される", () => {
    renderTrigger();
    expect(
      screen.getByRole("button", { name: "記事を検索" }),
    ).toBeInTheDocument();
  });

  it("ボタンクリックでダイアログが開く", async () => {
    const user = userEvent.setup();
    renderTrigger();
    await user.click(screen.getByRole("button", { name: "記事を検索" }));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });

  it("Cmd+Kでダイアログが開く", async () => {
    const user = userEvent.setup();
    renderTrigger();
    await user.keyboard("{Meta>}k{/Meta}");
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });
});
