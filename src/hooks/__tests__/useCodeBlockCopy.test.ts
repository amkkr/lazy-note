import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCodeBlockCopy } from "../useCodeBlockCopy";

describe("useCodeBlockCopy", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    // navigator.clipboardをモック
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  /**
   * containerRefを作成してrenderHookで実フックを起動するヘルパー
   */
  const setupHook = (element: HTMLDivElement) => {
    const ref = { current: element };
    return renderHook(() => useCodeBlockCopy(ref));
  };

  it("コピーボタンクリック時にclipboard.writeTextが呼ばれる", async () => {
    container.innerHTML = `
      <div class="code-block-wrapper">
        <button class="copy-btn" data-code="console.log(&quot;hello&quot;)">コピー</button>
        <pre><code>console.log("hello")</code></pre>
      </div>
    `;

    setupHook(container);

    const button = container.querySelector(".copy-btn") as HTMLElement;

    await act(async () => {
      button.click();
    });

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'console.log("hello")',
      );
    });
  });

  it("コピー成功時にボタンテキストが「コピー済み!」に変わる", async () => {
    vi.useFakeTimers();

    container.innerHTML = `
      <div class="code-block-wrapper">
        <button class="copy-btn" data-code="test code">コピー</button>
        <pre><code>test code</code></pre>
      </div>
    `;

    setupHook(container);

    const button = container.querySelector(".copy-btn") as HTMLElement;

    await act(async () => {
      button.click();
    });

    await vi.waitFor(() => {
      expect(button.textContent).toBe("コピー済み!");
    });

    // 2秒後に元に戻る
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button.textContent).toBe("コピー");
  });

  it("コピー失敗時にボタンテキストが「コピー失敗」に変わる", async () => {
    vi.useFakeTimers();

    // clipboard.writeTextを失敗させる
    Object.defineProperty(navigator, "clipboard", {
      value: {
        writeText: vi.fn().mockRejectedValue(new Error("Permission denied")),
      },
      writable: true,
      configurable: true,
    });

    container.innerHTML = `
      <div class="code-block-wrapper">
        <button class="copy-btn" data-code="test code">コピー</button>
        <pre><code>test code</code></pre>
      </div>
    `;

    setupHook(container);

    const button = container.querySelector(".copy-btn") as HTMLElement;

    await act(async () => {
      button.click();
    });

    await vi.waitFor(() => {
      expect(button.textContent).toBe("コピー失敗");
    });

    // 2秒後に元に戻る
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(button.textContent).toBe("コピー");
  });

  it("data-code属性のHTMLエンティティがデコードされる", async () => {
    container.innerHTML = `
      <div class="code-block-wrapper">
        <button class="copy-btn" data-code="const x = &quot;hello&quot; &amp;&amp; &#39;world&#39;">コピー</button>
        <pre><code>const x = "hello" && 'world'</code></pre>
      </div>
    `;

    setupHook(container);

    const button = container.querySelector(".copy-btn") as HTMLElement;

    await act(async () => {
      button.click();
    });

    await vi.waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "const x = \"hello\" && 'world'",
      );
    });
  });

  it("copy-btnクラスを持たない要素のクリックでは何も起きない", async () => {
    container.innerHTML = `
      <div class="code-block-wrapper">
        <button class="copy-btn" data-code="test">コピー</button>
        <pre><code>test</code></pre>
      </div>
      <button class="other-btn">他のボタン</button>
    `;

    setupHook(container);

    const otherButton = container.querySelector(".other-btn") as HTMLElement;

    await act(async () => {
      otherButton.click();
    });

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });
});

/**
 * フックのexport確認テスト
 */
describe("useCodeBlockCopy export", () => {
  it("関数としてエクスポートされている", () => {
    expect(typeof useCodeBlockCopy).toBe("function");
  });
});
