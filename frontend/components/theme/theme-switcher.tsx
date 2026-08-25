"use client";

import { Check, Monitor, Moon, Palette, Sun, type LucideIcon } from "lucide-react";
import {
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  APP_THEMES,
  APP_THEME_MODES,
  type AppTheme,
  type AppThemeModeOption,
} from "@/lib/theme/app-themes";
import { useAppTheme } from "./app-theme-provider";

const MODE_ICONS: Record<AppThemeModeOption["id"], LucideIcon> = {
  light: Sun,
  dark: Moon,
  system: Monitor,
};

function ModeOption({ mode }: { mode: AppThemeModeOption }) {
  const { mode: activeMode, setMode } = useAppTheme();
  const isActive = activeMode === mode.id;
  const Icon = MODE_ICONS[mode.id];

  function handleSelect() {
    setMode(mode.id);
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      aria-pressed={isActive}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 rounded-lg border px-2 py-1.5 text-dense font-medium transition-colors",
        isActive
          ? "border-ring bg-accent text-accent-foreground"
          : "border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {mode.label}
    </button>
  );
}

function ModeOptionsRow() {
  return (
    <div className="flex gap-1.5">
      {APP_THEME_MODES.map((mode) => (
        <ModeOption key={mode.id} mode={mode} />
      ))}
    </div>
  );
}

function ThemeOption({ theme }: { theme: AppTheme }) {
  const { theme: activeTheme, setTheme } = useAppTheme();
  const isActive = activeTheme === theme.id;

  function handleSelect() {
    setTheme(theme.id);
  }

  return (
    <button
      type="button"
      onClick={handleSelect}
      aria-pressed={isActive}
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium transition-colors",
        isActive
          ? "border-ring bg-accent text-accent-foreground"
          : "border-border text-foreground hover:bg-accent",
      )}
    >
      <span
        aria-hidden
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/10"
        style={{ backgroundColor: theme.swatch }}
      />
      <span className="flex-1 truncate text-left">{theme.label}</span>
      {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}

function ThemeOptionsGrid() {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {APP_THEMES.map((theme) => (
        <ThemeOption key={theme.id} theme={theme} />
      ))}
    </div>
  );
}

export function ThemeMenuPanel({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Palette className="h-3.5 w-3.5" />
        Interface theme
      </div>
      <ModeOptionsRow />
      <ThemeOptionsGrid />
    </div>
  );
}

export function ThemeMenuSubmenu() {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette className="h-3.5 w-3.5" />
        Interface theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64 p-2">
        <ModeOptionsRow />
        <DropdownMenuSeparator className="my-2" />
        <ThemeOptionsGrid />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
