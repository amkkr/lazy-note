import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";
import { center } from "../../../styled-system/patterns";

interface EmptyStateProps {
  icon: string;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export const EmptyState = ({
  icon,
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
            width: "24",
            height: "24",
            mx: "auto",
            mb: "6",
            bg: "gradients.accent",
            borderRadius: "full",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "2xl",
          })}
        >
          {icon}
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
          <Link
            to={action.href}
            className={css({
              display: "inline-flex",
              alignItems: "center",
              gap: "2",
              bg: "gradients.primary",
              // gradients.primary は明るいグラデのため、明確な対比をとるよう
              // 文字色は light=cream.50 / dark=ink.900 の CTA 配色を採用。
              // TODO(R-2c+): fg.onBrand semantic token に置換予定
              // (CTA 文字色を直書きせず semantic token に集約する。R-2a #388 は
              //  merge 準備中のため再変更は避け、R-2c または別 hotfix で導入。)
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
