import type { CSSProperties, ReactNode } from "react";
import { css } from "../../../styled-system/css";

interface BaseTypographyProps {
  children: ReactNode;
  className?: string;
  /**
   * インラインスタイル。Hero morph (Issue #397) で `view-transition-name` を
   * 動的に注入するなど、Panda CSS の className では扱いづらい CSS プロパティを
   * 限定的に受けるために許容する。通常スタイリングは className 経由が望ましい。
   */
  style?: CSSProperties;
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
  style,
}: HeadingProps) => {
  const baseStyles = css({});

  const variantStyles = {
    page: css({ fontSize: "3xl" }),
    article: css({ fontSize: "2xl" }),
    card: css({ fontSize: "2xl" }),
  };

  return (
    <h1
      className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}
      style={style}
    >
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
    page: css({ fontSize: "2xl", lineHeight: "normal" }),
    article: css({
      fontSize: "xl",
      lineHeight: "relaxed",
    }),
    card: css({
      fontSize: "xl",
      lineHeight: "relaxed",
      color: "fg.primary",
      "&:hover": { color: "accent.link" },
    }),
  };

  return (
    <h2
      className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}
    >
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
    page: css({ fontSize: "xl", lineHeight: "normal" }),
    article: css({
      fontSize: "lg",
      lineHeight: "relaxed",
    }),
    card: css({ fontSize: "lg", lineHeight: "relaxed" }),
  };

  return (
    <h3
      className={`${baseStyles} ${variantStyles[variant]} ${className || ""}`}
    >
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
  // Editorial Citrus トークン (R-2b / Issue #389)
  // - small (補助情報): fg.secondary (light 9.59:1 AAA / dark 14.84:1 AAA)
  // - body / large (本文): fg.primary (light 17.16:1 AAA / dark 16.98:1 AAA)
  const variantStyles = {
    small: css({
      fontSize: "sm",
      lineHeight: "relaxed",
      color: "fg.secondary",
    }),
    body: css({
      fontSize: "base",
      lineHeight: "loose",
      color: "fg.primary",
    }),
    large: css({
      fontSize: "lg",
      lineHeight: "body",
      color: "fg.primary",
    }),
  };

  return (
    <p className={`${variantStyles[variant]} ${className || ""}`}>{children}</p>
  );
};

/**
 * テキストスパンコンポーネント
 */
export const Text = ({ children, className }: BaseTypographyProps) => {
  return <span className={className}>{children}</span>;
};
