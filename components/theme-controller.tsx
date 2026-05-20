"use client";

import { useEffect, useState } from "react";

type Theme = "dark" | "light";

const STORAGE_KEY = "focusread-theme";

export function ThemeController() {
  const [theme, setTheme] = useState<Theme>("dark");
  const [transitionTheme, setTransitionTheme] = useState<Theme | null>(null);
  const [isLanding, setIsLanding] = useState<boolean>(false);

  useEffect(() => {
    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    const initialTheme: Theme = storedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTransitionTheme(nextTheme);
    setTheme(nextTheme);
  };

  // Determine if we're on the landing page on the client and hide the toggle there
  useEffect(() => {
    try {
      const p = window.location?.pathname || "/";
      setIsLanding(p === "/" || p === "");
    } catch (e) {
      setIsLanding(false);
    }
  }, []);

  if (isLanding) return null;

  return (
    <>
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        className="theme-toggle-button"
      >
        <span className="theme-toggle-label">{theme === "dark" ? "Light" : "Dark"}</span>
        <span className="theme-toggle-track">
          <span className={`theme-toggle-thumb ${theme === "light" ? "theme-toggle-thumb-on" : ""}`} />
        </span>
      </button>

      {transitionTheme ? (
        <div
          key={transitionTheme}
          className={`theme-transition-overlay theme-transition-${transitionTheme}`}
          onAnimationEnd={() => setTransitionTheme(null)}
        />
      ) : null}
    </>
  );
}