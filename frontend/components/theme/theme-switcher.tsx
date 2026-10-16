"use client";

import type { MouseEvent as ReactMouseEvent, PointerEvent } from "react";
import { motion, useReducedMotion } from "framer-motion";
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

function ModeOption({
  mode,
  layoutId,
}: {
  mode: AppThemeModeOption;
  layoutId: string;
}) {
  const { mode: activeMode, setMode } = useAppTheme();
  const reduceMotion = useReducedMotion() === true;
  const isActive = activeMode === mode.id;
  const Icon = MODE_ICONS[mode.id];

  function applyMode(event: PointerEvent<HTMLButtonElement> | ReactMouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    setMode(mode.id);
  }

  return (
    <button
      type="button"
      onPointerDownCapture={applyMode}
      onClick={applyMode}
      aria-pressed={isActive}
      className={cn(
        "relative flex flex-1 flex-col items-center gap-1 rounded-md px-2 py-1.5 text-sm font-medium active:scale-[0.97]",
        "transition-colors duration-200 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {isActive ? (
        <motion.span
          layoutId={layoutId}
          aria-hidden
          className="absolute inset-0 rounded-md bg-card shadow-xs"
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 500, damping: 34 }
          }
        />
      ) : null}
      <Icon
        className={cn(
          "relative z-10 h-3.5 w-3.5 transition-transform duration-200 motion-reduce:transition-none",
          isActive && "scale-110",
        )}
      />
      <span className="relative z-10">{mode.label}</span>
    </button>
  );
}

function ModeOptionsRow({ layoutId }: { layoutId: string }) {
  return (
    <div
      role="group"
      aria-label="Appearance"
      className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1"
    >
      {APP_THEME_MODES.map((mode) => (
        <ModeOption key={mode.id} mode={mode} layoutId={layoutId} />
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

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    event.preventDefault();
    setTheme(theme.id);
  }

  return (
    <button
      type="button"
      onPointerDown={handlePointerDown}
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
        className="h-3.5 w-3.5 shrink-0 rounded-full border border-foreground/25"
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
      <ModeOptionsRow layoutId="appearance-mode-panel" />
      <ThemeOptionsGrid />
    </div>
  );
}

export function ThemeModeMenuItems() {
  return (
    <div className="px-2 pb-1.5">
      <ModeOptionsRow layoutId="appearance-mode-menu" />
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
      <DropdownMenuSubContent
        sideOffset={-4}
        alignOffset={-4}
        collisionPadding={16}
        className="w-64 max-h-[min(28rem,var(--radix-dropdown-menu-content-available-height))] overflow-y-auto p-2"
      >
        <ModeOptionsRow layoutId="appearance-mode-submenu" />
        <DropdownMenuSeparator className="my-2" />
        <ThemeOptionsGrid />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
