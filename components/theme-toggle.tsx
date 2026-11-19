"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/use-media-query";

type Theme = "light" | "dark";
const storageKey = "routelens-theme";

/** Light/dark switch. Follows the OS until the user picks; the choice is remembered on this device. */
export function ThemeToggle() {
  const systemDark = useMediaQuery("(prefers-color-scheme: dark)");
  const [chosen, setChosen] = useState<Theme | null>(null);

  // The inline script in layout.tsx already applied a saved theme; read it back after hydration.
  useEffect(() => {
    const saved = document.documentElement.dataset.theme;
    if (saved === "light" || saved === "dark") setChosen(saved);
  }, []);

  const theme: Theme = chosen ?? (systemDark ? "dark" : "light");
  const next: Theme = theme === "dark" ? "light" : "dark";

  function toggle() {
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(storageKey, next); } catch { /* storage blocked: still switch for this visit */ }
    setChosen(next);
  }

  return <Button className="icon-button theme-toggle" onClick={toggle} aria-label={next === "dark" ? "เปลี่ยนเป็นธีมมืด" : "เปลี่ยนเป็นธีมสว่าง"} title={next === "dark" ? "ธีมมืด" : "ธีมสว่าง"}>
    {theme === "dark" ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
  </Button>;
}
