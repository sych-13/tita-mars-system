import { createContext, useContext, useEffect, useRef, useState } from "react";

const ThemeContext = createContext();
const STORAGE_KEY = "tita-mars-theme";

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(
    () => localStorage.getItem(STORAGE_KEY) || "light",
  );
  const firstRender = useRef(true);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
    localStorage.setItem(STORAGE_KEY, theme);

    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }

    // Keep the theme switch smooth without animating the first page load.
    root.classList.remove("theme-transitioning");
    void root.offsetWidth;
    root.classList.add("theme-transitioning");
    const timer = window.setTimeout(
      () => root.classList.remove("theme-transitioning"),
      760,
    );
    return () => window.clearTimeout(timer);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => (current === "light" ? "dark" : "light"));
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
