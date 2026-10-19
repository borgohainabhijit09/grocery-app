"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type Theme = "light" | "dark" | "system";

const STORAGE_KEY = "fb-theme";
const listeners = new Set<() => void>();
let cachedSnapshot: Theme | undefined;

function readStored(): Theme {
  if (typeof window === "undefined") return "light";
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "light" || value === "dark" || value === "system" ? value : "light";
}

function emit() {
  for (const listener of listeners) listener();
}

function prefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const isDark = theme === "dark" || (theme === "system" && prefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function setTheme(theme: Theme) {
  cachedSnapshot = theme;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore private-mode failures */
  }
  applyTheme(theme);
  emit();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function getSnapshot(): Theme {
  if (cachedSnapshot === undefined) cachedSnapshot = readStored();
  return cachedSnapshot;
}

function getServerSnapshot(): Theme {
  return "light";
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(theme);
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const resolved: "light" | "dark" = theme === "system" ? (prefersDark() ? "dark" : "light") : theme;

  return { theme, resolved, setTheme };
}

/** Inline script that applies the stored theme before paint to avoid a flash. */
export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem('${STORAGE_KEY}')||'light';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d)r.classList.add('dark');r.style.colorScheme=d?'dark':'light';}catch(e){}})();`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

export function ThemeToggle() {
  const { theme, resolved, setTheme: update } = useTheme();
  const Icon = ICONS[theme];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Theme: ${theme}`}>
          <Icon className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Appearance</DropdownMenuLabel>
        <DropdownMenuItem onSelect={() => update("light")}>
          <Sun className="size-4" /> Light
          {resolved === "light" && theme === "light" ? <span className="ml-auto text-xs">•</span> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => update("dark")}>
          <Moon className="size-4" /> Dark
          {theme === "dark" ? <span className="ml-auto text-xs">•</span> : null}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => update("system")}>
          <Monitor className="size-4" /> System
          {theme === "system" ? <span className="ml-auto text-xs">•</span> : null}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
