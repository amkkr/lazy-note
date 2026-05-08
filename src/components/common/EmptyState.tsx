import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";
import { center } from "../../../styled-system/patterns";
import { focusRingOnAccentStyles } from "../../styles/focusRing";
import type { IconComponent } from "../atoms/icons";

interface EmptyStateProps {
  /**
   * 装飾用 inline SVG アイコンコンポーネント。
   *
   * R-4 (Issue #392) で旧 `string` icon (絵文字) から inline SVG icon に変更。
   * 装飾扱いとして `aria-hidden` で SR から隠し、`title` / `description` で
   * 意味を伝える。Calm 思想 (装飾ノイズの徹底削除) に沿って円形 gradient
   * 背景は廃止し、線画アイコンを単独で配置する。
   */
  icon: IconComponent;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) => {
  return (
    <div className={center({ py: "20" })}>
      <div
        className={css({
          textAlign: "center",
          maxWidth: "md",
          mx: "auto",
          p: "8",
        })}
      >
        <div
          className={css({
            mx: "auto",
            mb: "6",
            color: "fg.muted",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          })}
        >
          <Icon aria-hidden="true" size={48} strokeWidth={1.5} />
        </div>
        <h3
          className={css({
            fontSize: "2xl",
            fontWeight: "bold",
            color: "fg.primary",
            mb: "4",
          })}
        >
          {title}
        </h3>
        {/*
         * description は記事一覧の excerpt と同じく本文寄り用途のため、
         * fg.muted (light: 6.54:1 AA) ではなく fg.secondary (light: 9.59:1 AAA /
         * dark: 14.84:1 AAA) を採用する。
         * (R-2c レビュー指摘: 補助情報ではなく読まれる前提のテキストのため。)
         */}
        <p
          className={css({
            color: "fg.secondary",
            fontSize: "lg",
            lineHeight: "body",
            mb: action ? "8" : "0",
          })}
        >
          {description}
        </p>
        {action && (
          // R-4 (Issue #392) で CTA の文字色を AA pass の組合せに修正。
          // accent.brand 背景に対し fg.onBrand (Issue #408 で semantic token 化):
          //   - light: fg.onBrand (cream-50) × accent.brand (persimmon-600) = 5.74:1 PASS (AA)
          //   - dark : fg.onBrand (ink-900)  × accent.brand (persimmon-500) = 5.42:1 PASS (AA)
          // calculateContrast.ts の `cta/light` `cta/dark` ペアと同期させる。
          //
          // R-5 (Issue #393) AC i: accent.brand 背景上の CTA は
          // `focusRingOnAccentStyles` (内側 ink-900/cream-50 + 外側 citrus-500)
          // で 2px 以上の visible focus ring を提供する。
          <Link
            to={action.href}
            className={`${css({
              display: "inline-flex",
              alignItems: "center",
              gap: "2",
              bg: "accent.brand",
              color: "fg.onBrand",
              px: "6",
              py: "3",
              borderRadius: "full",
              fontSize: "sm",
              fontWeight: "600",
              textDecoration: "none",
              shadow: "lg",
              transition: "all 0.2s ease",
              _hover: {
                transform: "translateY(-2px)",
                shadow: "xl",
              },
            })} ${focusRingOnAccentStyles}`}
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
};
