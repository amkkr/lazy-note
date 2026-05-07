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

const containerStyle = css({
  background: "bg.0",
  borderRadius: "sm",
  border: "1px solid",
  borderColor: "bg.3",
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
  color: "fg.0",
  fontWeight: "bold",
  fontSize: "base",
  cursor: "pointer",
  borderRadius: "sm",
  "&:hover": {
    background: "bg.2",
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
  color: "fg.2",
  textDecoration: "none",
  borderRadius: "xs",
  fontSize: "sm-lg",
  lineHeight: "1.4",
  "&:hover": {
    color: "fg.0",
    background: "bg.2",
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
