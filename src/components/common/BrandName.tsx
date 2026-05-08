import { Link } from "react-router-dom";
import { css } from "../../../styled-system/css";

interface BrandNameProps {
  variant?: "header" | "footer";
  /**
   * 旧装飾アイコン (Sparkles 絵文字) の表示有無 (R-4 / Issue #392 で削除)。
   *
   * Calm 思想 (装飾ノイズの徹底削除) に基づき、ブランド表記は文字列のみに統一した。
   * 既存呼び出し元の互換性のため prop 自体は残しているが、何も描画されない。
   * 後続のリファクタリングで呼び出し元と合わせて削除予定。
   *
   * @deprecated R-4 完了時点で機能なし。新規利用は避けること。
   */
  showIcon?: boolean;
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
