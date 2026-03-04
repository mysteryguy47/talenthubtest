import { ReactNode, useEffect } from "react";

// Site is permanently dark mode — no toggle, no light mode.
export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
    document.body.style.backgroundColor = "#020617";
    localStorage.removeItem("theme");
  }, []);
  return <>{children}</>;
}

export function useTheme() {
  return {
    theme: "dark" as const,
    toggleTheme: () => {},
    setTheme: () => {},
  };
}
