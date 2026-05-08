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
        color: isHeader ? "fg.0" : "fg.2",
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
