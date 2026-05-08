import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";
import { center } from "../../../styled-system/patterns";
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
        <p
          className={css({
            color: "fg.muted",
            fontSize: "lg",
            lineHeight: "body",
            mb: action ? "8" : "0",
          })}
        >
          {description}
        </p>
        {action && (
          // R-4 (Issue #392) で CTA の文字色を AA pass の組合せに修正。
          // accent.brand 背景に対し:
          //   - light (persimmon-600 上): cream.50 で 5.74:1 PASS (AA)
          //   - dark  (persimmon-500 上): ink.900 で 5.42:1 PASS (AA)
          // calculateContrast.ts の `cta/light` `cta/dark` ペアと同期させる。
          <Link
            to={action.href}
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "2",
              bg: "accent.brand",
              // CTA 文字色は light=cream.50 / dark=ink.900 (calculateContrast.ts の
              // cta/light: 5.74:1, cta/dark: 5.42:1 と同期)。
              // TODO(R-2c+): fg.onBrand semantic token に置換予定
              // (CTA 文字色を直書きせず semantic token に集約する。Button.tsx /
              //  Link.tsx と表記を揃えており、将来一括で置換する想定。)
              color: { _light: "cream.50", _dark: "ink.900" },
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
            })}
          >
            {action.label}
          </Link>
        )}
      </div>
    </div>
  );
};
