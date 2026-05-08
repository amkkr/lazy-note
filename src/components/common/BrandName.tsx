import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";

interface BrandNameProps {
  variant?: "header" | "footer";
  showIcon?: boolean;
}

export const BrandName = ({
  variant = "header",
  showIcon = true,
}: BrandNameProps) => {
  const isHeader = variant === "header";

  return (
    <Link
      to="/"
      className={css({
        fontSize: isHeader ? "lg" : "sm",
        fontWeight: "bold",
        // Editorial Citrus: header はブランド見出し相当 (fg.primary)、
        // footer は補助情報相当 (fg.secondary)
        color: isHeader ? "fg.primary" : "fg.secondary",
        textDecoration: "none",
        ...(variant === "footer" && {
          marginBottom: "xs",
        }),
      })}
    >
      {showIcon && "✨ "}Lazy Note
    </Link>
  );
};
