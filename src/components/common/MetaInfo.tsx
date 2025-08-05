import { css } from "../../../styled-system/css";

interface MetaInfoProps {
  createdAt?: string;
  author?: string;
  variant?: "card" | "header";
}

export const MetaInfo = ({
  createdAt,
  author,
  variant = "card",
}: MetaInfoProps) => {
  const isHeader = variant === "header";

  return (
    <div
      className={css({
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "md",
        marginTop: variant === "card" ? "0" : "0",
        paddingTop: variant === "card" ? "0" : "0",
      })}
    >
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "sm",
          fontSize: "sm",
          color: isHeader ? "white" : "#6b7280",
          ...(isHeader && {
            background: "rgba(255, 255, 255, 0.2)",
            paddingY: "sm",
            paddingX: "md",
            borderRadius: "xl",
          }),
        })}
      >
        <span>📅</span>
        <span>{createdAt || "日付未設定"}</span>
      </div>
      <div
        className={css({
          display: "flex",
          alignItems: "center",
          gap: "sm",
          fontSize: "sm",
          color: isHeader ? "white" : "#6b7280",
          ...(isHeader && {
            background: "rgba(255, 255, 255, 0.2)",
            paddingY: "sm",
            paddingX: "md",
            borderRadius: "xl",
          }),
        })}
      >
        <span>✍️</span>
        <span>{author || "匿名"}</span>
      </div>
    </div>
  );
};
