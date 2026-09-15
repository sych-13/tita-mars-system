import { useTheme } from "../context/ThemeContext";
import Icon from "./Icon";
export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
    >
      <span
        className={theme === "light" ? "theme-option selected" : "theme-option"}
      >
        <Icon name="sun" size={18} weight="fill" />
      </span>
      <span
        className={theme === "dark" ? "theme-option selected" : "theme-option"}
      >
        <Icon name="moon" size={18} />
      </span>
    </button>
  );
}
