import type { ReactNode } from "react";
import { css } from "../../../styled-system/css";

interface BaseTypographyProps {
  children: ReactNode;
  className?: string;
}

interface HeadingProps extends BaseTypographyProps {
  variant?: "page" | "article" | "card";
}

interface ParagraphProps extends BaseTypographyProps {
  variant?: "body" | "small" | "large";
}

/**
 * H1見出しコンポーネント
 */
export const Heading1 = ({
  children,
  variant = "page",
  className,
}: HeadingProps) => {
  const baseStyles = css({});

  const variantStyles = {
    page: css({ fontSize: "3xl" }),
    article: css({ fontSize: "2xl" }),
    card: css({ fontSize: "2xl" }),
  };

  return (
    <h1 className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}>
      {children}
    </h1>
  );
};

/**
 * H2見出しコンポーネント
 */
export const Heading2 = ({
  children,
  variant = "article",
  className,
}: HeadingProps) => {
  const baseStyles = css({});

  const variantStyles = {
    page: css({ fontSize: "2xl", lineHeight: "1.3" }),
    article: css({
      fontSize: "xl",
      lineHeight: "1.4",
    }),
    card: css({
      fontSize: "xl",
      lineHeight: "1.4",
      color: "fg.1",
      "&:hover": { color: "blue.light" },
    }),
  };

  return (
    <h2 className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}>
      {children}
    </h2>
  );
};

/**
 * H3見出しコンポーネント
 */
export const Heading3 = ({
  children,
  variant = "article",
  className,
}: HeadingProps) => {
  const baseStyles = css({});

  const variantStyles = {
    page: css({ fontSize: "xl", lineHeight: "1.3" }),
    article: css({
      fontSize: "lg",
      lineHeight: "1.4",
    }),
    card: css({ fontSize: "lg", lineHeight: "1.4" }),
  };

  return (
    <h3 className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}>
      {children}
    </h3>
  );
};

/**
 * 段落コンポーネント
 */
export const Paragraph = ({
  children,
  variant = "body",
  className,
}: ParagraphProps) => {
  const variantStyles = {
    body: css({
      fontSize: "base",
      lineHeight: "1.7",
      color: "fg.1",
    }),
    small: css({
      fontSize: "sm",
      lineHeight: "1.6",
      color: "fg.2",
    }),
    large: css({
      fontSize: "lg",
      lineHeight: "1.8",
      color: "fg.1",
    }),
  };

  return (
    <p className={`${variantStyles[variant]} ${className || ""}`}>
      {children}
    </p>
  );
};

/**
 * テキストスパンコンポーネント
 */
export const Text = ({ children, className }: BaseTypographyProps) => {
  return <span className={className}>{children}</span>;
};