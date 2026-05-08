import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";

interface BrandNameProps {
  variant?: "header" | "footer";
}

export const BrandName = ({ variant = "header" }: BrandNameProps) => {
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
      Lazy Note
    </Link>
  );
};
