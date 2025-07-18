import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetaInfo } from "../MetaInfo";

describe("MetaInfo", () => {
  it("作成日と著者が正しく表示される", () => {
    render(<MetaInfo createdAt="2024-01-01" author="山田太郎" />);
    
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
    expect(screen.getByText("📅")).toBeInTheDocument();
    expect(screen.getByText("✍️")).toBeInTheDocument();
  });

  it("作成日が未設定の場合、デフォルトテキストが表示される", () => {
    render(<MetaInfo author="山田太郎" />);
    
    expect(screen.getByText("日付未設定")).toBeInTheDocument();
    expect(screen.getByText("山田太郎")).toBeInTheDocument();
  });

  it("著者が未設定の場合、デフォルトテキストが表示される", () => {
    render(<MetaInfo createdAt="2024-01-01" />);
    
    expect(screen.getByText("2024-01-01")).toBeInTheDocument();
    expect(screen.getByText("匿名")).toBeInTheDocument();
  });

  it("両方未設定の場合、両方のデフォルトテキストが表示される", () => {
    render(<MetaInfo />);
    
    expect(screen.getByText("日付未設定")).toBeInTheDocument();
    expect(screen.getByText("匿名")).toBeInTheDocument();
  });

  it("cardバリアントがデフォルトで適用される", () => {
    const { container } = render(<MetaInfo createdAt="2024-01-01" author="山田太郎" />);
    
    // cardバリアントの場合、marginTopとpaddingTopが適用される
    const metaInfo = container.firstChild as HTMLElement;
    expect(metaInfo.className).toContain("mt_16px");
    expect(metaInfo.className).toContain("pt_16px");
  });

  it("headerバリアントが正しく適用される", () => {
    const { container } = render(
      <MetaInfo createdAt="2024-01-01" author="山田太郎" variant="header" />
    );
    
    // headerバリアントの場合、子要素に背景が適用される
    const metaInfo = container.firstChild as HTMLElement;
    const dateElement = metaInfo.querySelector('[class*="bg_"]');
    expect(dateElement).toBeInTheDocument();
  });

  it("空文字列を渡した場合、デフォルトテキストが表示される", () => {
    render(<MetaInfo createdAt="" author="" />);
    
    expect(screen.getByText("日付未設定")).toBeInTheDocument();
    expect(screen.getByText("匿名")).toBeInTheDocument();
  });

  it("長いテキストでも正しくレイアウトされる", () => {
    render(
      <MetaInfo 
        createdAt="2024年12月31日 23時59分59秒" 
        author="非常に長い名前を持つ著者の名前です" 
      />
    );
    
    expect(screen.getByText("2024年12月31日 23時59分59秒")).toBeInTheDocument();
    expect(screen.getByText("非常に長い名前を持つ著者の名前です")).toBeInTheDocument();
  });
});