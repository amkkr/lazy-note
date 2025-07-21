import { css } from "../../../styled-system/css";
import { center } from "../../../styled-system/patterns";

interface LoadingSpinnerProps {
  message?: string;
}

export const LoadingSpinner = ({
  message = "読み込み中...",
}: LoadingSpinnerProps) => {
  return (
    <div className={center({ minHeight: "100vh" })}>
      <div
        className={css({
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "4",
          p: "8",
        })}
      >
        <div
          className={css({
            width: "16",
            height: "16",
            border: "4px solid",
            borderColor: "primary.200",
            borderTopColor: "primary.600",
            borderRadius: "full",
            animation: "spin 1s linear infinite",
          })}
        />
        <p
          className={css({
            fontSize: "lg",
            color: "secondary.600",
            fontWeight: "500",
          })}
        >
          {message}
        </p>
      </div>
    </div>
  );
};
