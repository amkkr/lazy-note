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
        color: isHeader ? "fg.0" : "fg.2",
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
