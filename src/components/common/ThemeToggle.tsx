import { Switch } from "@headlessui/react";
import { css } from "../../../styled-system/css";
import { useTheme } from "../../hooks/useTheme";

const switchStyles = css({
  position: "relative",
  display: "inline-flex",
  alignItems: "center",
  width: "56px",
  height: "28px",
  borderRadius: "full",
  border: "2px solid",
  borderColor: "bg.3",
  cursor: "pointer",
  transition: "all 0.2s ease",
  background: "bg.2",
});

const thumbStyles = css({
  display: "inline-block",
  width: "20px",
  height: "20px",
  borderRadius: "full",
  background: "fg.0",
  transition: "transform 0.2s ease",
});

const thumbTranslateOff = css({ transform: "translateX(2px)" });
const thumbTranslateOn = css({ transform: "translateX(28px)" });

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === "light";

  return (
    <Switch
      checked={isLight}
      onChange={toggleTheme}
      className={switchStyles}
      aria-label="テーマ切替"
    >
      <span
        className={`${thumbStyles} ${isLight ? thumbTranslateOn : thumbTranslateOff}`}
      />
    </Switch>
  );
};
