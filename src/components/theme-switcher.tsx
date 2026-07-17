"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, Droplet } from "lucide-react";
import { cn } from "@/lib/utils";

const THEMES = [
  { key: "light", label: "Putih", icon: Sun },
  { key: "dark", label: "Gelap", icon: Moon },
  { key: "blue", label: "Biru", icon: Droplet },
] as const;

type ThemeKey = (typeof THEMES)[number]["key"];
export const THEME_STORAGE_KEY = "berkahpos_theme";

export function applyTheme(theme: ThemeKey) {
  const root = document.documentElement;
  if (theme === "light") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<ThemeKey>("light");

  useEffect(() => {
    const saved = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey) || "light";
    setTheme(saved);
    applyTheme(saved);
  }, []);

  function pick(t: ThemeKey) {
    setTheme(t);
    applyTheme(t);
    localStorage.setItem(THEME_STORAGE_KEY, t);
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      {THEMES.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          onClick={() => pick(key)}
          title={`Tema ${label}`}
          aria-label={`Tema ${label}`}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
            theme === key
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

/** Script anti-kedip: pasang tema sebelum halaman tampil. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_STORAGE_KEY}');if(t&&t!=='light'){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;
