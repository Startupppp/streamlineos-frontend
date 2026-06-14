"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { cn } from "@/lib/utils";

type Variant = "button" | "menu-item" | "icon";

interface ThemeToggleProps {
  variant?: Variant;
  className?: string;
  align?: "start" | "end" | "center";
}

const OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

export function ThemeToggle({
  variant = "icon",
  className,
  align = "end",
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const ActiveIcon = !mounted
    ? Sun
    : theme === "system"
      ? Monitor
      : resolvedTheme === "dark"
        ? Moon
        : Sun;

  if (variant === "menu-item") {
    return (
      <div className={cn("px-1 py-0.5", className)}>
        <p className="px-1.5 py-1 text-[10px] font-medium text-muted-foreground">
          Theme
        </p>
        <div className="grid grid-cols-3 gap-1">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = mounted && theme === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTheme(opt.value)}
                aria-pressed={isActive}
                aria-label={`Set ${opt.label} theme`}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-md py-1.5 text-[10px] font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (variant === "button") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn("gap-2", className)}
            aria-label="Change theme"
          >
            <ActiveIcon className="h-3.5 w-3.5" />
            <span className="text-xs">
              {mounted ? (theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light") : "Theme"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} className="w-36">
          {OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isActive = mounted && theme === opt.value;
            return (
              <DropdownMenuItem
                key={opt.value}
                onClick={() => setTheme(opt.value)}
                className="cursor-pointer gap-2 text-xs"
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="flex-1">{opt.label}</span>
                {isActive && <Check className="h-3 w-3 text-blue-600" />}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Change theme"
          className={cn(
            "h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors",
            className,
          )}
        >
          <ActiveIcon className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-36">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = mounted && theme === opt.value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              className="cursor-pointer gap-2 text-xs"
            >
              <Icon className="h-3.5 w-3.5" />
              <span className="flex-1">{opt.label}</span>
              {isActive && <Check className="h-3 w-3 text-blue-600" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
