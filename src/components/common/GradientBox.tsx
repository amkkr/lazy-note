import type { ReactNode } from "react";
import { css } from "../../../styled-system/css";

interface GradientBoxProps {
  children: ReactNode;
  variant?: "primary" | "accent";
  showPattern?: boolean;
  className?: string;
}

export const GradientBox = ({
  children,
  variant = "primary",
  showPattern = false,
  className = "",
}: GradientBoxProps) => {
  const gradients = {
    primary: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    accent: "linear-gradient(135deg, #f97316 0%, #ea580c 100%)",
  };

  return (
    <div
      className={
        css({
          background: gradients[variant],
          position: "relative",
          overflow: "hidden",
        }) + (className ? ` ${className}` : "")
      }
    >
      {showPattern && (
        <div
          className={css({
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              'url("data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%222%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            opacity: "0.3",
          })}
        />
      )}
      <div className={css({ position: "relative" })}>{children}</div>
    </div>
  );
};
