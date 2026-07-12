"use client";

import { Check, Palette } from "lucide-react";
import {
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { APP_THEMES, type AppTheme } from "@/lib/theme/app-themes";
import { useAppTheme } from "./app-theme-provider";

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

export function ThemeMenuSubmenu() {
  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Palette className="h-3.5 w-3.5" />
        Interface theme
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="w-64 p-2">
        <ThemeOptionsGrid />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
