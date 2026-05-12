import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import React from "react";
import { css } from "../../../styled-system/css";
import type { TocItem } from "../../lib/markdown";

interface TableOfContentsProps {
  toc: TocItem[];
}

// Editorial Citrus トークン (R-2b / Issue #389)
// - 目次は本文と同じレイヤーに配置するため bg.canvas を使用
// - ボーダーは border.subtle で薄く差別化 (Issue #419 で bg.surface から置換)
// - 見出し / リンクの hover 背景は bg.elevated
//
// Issue #409 で導入した border 専用 token (border.subtle) を採用 (Issue #419)。
// - 旧実装は bg.surface を使用していたが、light の bg.surface (cream-100) は
//   外側 bg.canvas (cream-50) との差が 1.06:1 で視覚消失していた。
// - border.subtle は WCAG 1.4.11 (Non-text Contrast) の 3:1 を満たす:
//   light: cream-300 × cream-50 (bg.canvas) = 3.49:1
//   dark : sumi-450  × sumi-950 (bg.canvas) = 6.18:1 (Issue #423 で sumi-400 から変更、Calm 思想と整合)
const containerStyle = css({
  background: "bg.canvas",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "border.subtle",
  marginTop: "md",
  marginBottom: "md",
});

const buttonStyle = css({
  width: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "sm-md md",
  background: "transparent",
  color: "fg.primary",
  fontWeight: "bold",
  fontSize: "base",
  cursor: "pointer",
  borderRadius: "sm",
  "&:hover": {
    background: "bg.elevated",
  },
});

const panelStyle = css({
  padding: "0 md md",
});

const listStyle = css({
  listStyle: "none",
  padding: "0",
  margin: "0",
});

const listItemStyle = css({
  margin: "0",
});

const linkBaseStyle = css({
  display: "block",
  padding: "xs-sm sm-md",
  color: "fg.secondary",
  textDecoration: "none",
  borderRadius: "xs",
  fontSize: "sm-lg",
  lineHeight: "1.4",
  "&:hover": {
    color: "fg.primary",
    background: "bg.elevated",
  },
});

const indentedLinkStyle = css({
  paddingLeft: "lg",
});

/**
 * スムーズスクロールで見出しへ移動するハンドラ
 */
const handleSmoothScroll = (
  event: React.MouseEvent<HTMLAnchorElement>,
): void => {
  event.preventDefault();
  const href = event.currentTarget.getAttribute("href");
  if (!href) {
    return;
  }

  const targetId = href.slice(1);
  const targetElement = document.getElementById(targetId);
  if (targetElement) {
    targetElement.scrollIntoView({ behavior: "smooth" });
  }
};

export const TableOfContents: React.FC<TableOfContentsProps> = React.memo(
  ({ toc }) => {
    if (toc.length === 0) {
      return null;
    }

    return (
      <Disclosure defaultOpen>
        <div className={containerStyle}>
          <DisclosureButton className={buttonStyle}>目次</DisclosureButton>
          <DisclosurePanel className={panelStyle}>
            <ul className={listStyle}>
              {toc.map((item) => (
                <li key={item.id} className={listItemStyle}>
                  <a
                    href={`#${item.id}`}
                    onClick={handleSmoothScroll}
                    className={`${linkBaseStyle} ${item.level === 3 ? indentedLinkStyle : ""}`}
                  >
                    {item.text}
                  </a>
                </li>
              ))}
            </ul>
          </DisclosurePanel>
        </div>
      </Disclosure>
    );
  },
);

TableOfContents.displayName = "TableOfContents";
