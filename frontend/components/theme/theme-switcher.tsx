"use client";

import { Check, Palette } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

function renderThemeOption(theme: AppTheme) {
  return <ThemeOption key={theme.id} theme={theme} />;
}

export function ThemeSwitcher() {
  return (
    <Popover>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Interface theme"
              className="h-8 w-8 rounded-lg flex items-center justify-center text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
            >
              <Palette className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Interface theme
        </TooltipContent>
      </Tooltip>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-2">
        <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Interface theme
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {APP_THEMES.map(renderThemeOption)}
        </div>
      </PopoverContent>
    </Popover>
  );
}
