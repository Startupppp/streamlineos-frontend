"use client";

import { useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { cn } from "@/lib/utils";

export interface MobileFilterOption {
  value: string;
  label: string;
}

export interface MobileFilterGroup {
  label: string;
  value: string;
  options: MobileFilterOption[];
  onChange: (value: string) => void;
  /** Value that means "no filter" — excluded from the active count + label. Defaults to "all". */
  neutralValue?: string;
}

/**
 * Mobile-only (`sm:hidden`) collapse of secondary filter Selects into a single
 * "Filters" button that opens a Drawer (via ResponsivePopover). Render alongside
 * the desktop Selects (which should carry `hidden sm:flex`). §14 mobile-Drawer rule.
 */
export function MobileFilterDrawer({
  groups,
  className,
  ariaLabel = "Filters",
}: {
  groups: MobileFilterGroup[];
  className?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  const activeGroups = groups.filter((g) => g.value !== (g.neutralValue ?? "all"));
  const activeCount = activeGroups.length;
  const label =
    activeGroups
      .map((g) => g.options.find((o) => o.value === g.value)?.label)
      .filter(Boolean)
      .join(" · ") || "Filters";

  return (
    <ResponsivePopover open={open} onOpenChange={setOpen}>
      <ResponsivePopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(FILTER_SELECT_TRIGGER, "sm:hidden shrink-0 h-8 gap-1.5 max-w-[170px]", className)}
          aria-label={ariaLabel}
        >
          <SlidersHorizontal className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{label}</span>
          {activeCount > 0 && (
            <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-primary text-micro font-semibold text-primary-foreground">
              {activeCount}
            </span>
          )}
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </ResponsivePopoverTrigger>
      <ResponsivePopoverContent align="end" title={ariaLabel} className="w-56 p-1">
        <div role="menu" aria-label={ariaLabel}>
          {groups.map((group, groupIndex) => (
            <div key={group.label}>
              {groupIndex > 0 && <div className="-mx-1 my-1 h-px bg-border" />}
              <p className="px-2 py-1.5 text-xs font-medium text-muted-foreground">{group.label}</p>
              {group.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="menuitemradio"
                  aria-checked={group.value === option.value}
                  onClick={() => {
                    group.onChange(option.value);
                    setOpen(false);
                  }}
                  className="relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-xs outline-none select-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                >
                  <span
                    className={cn(
                      "flex h-3.5 w-3.5 items-center justify-center",
                      group.value !== option.value && "opacity-0",
                    )}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-left">{option.label}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      </ResponsivePopoverContent>
    </ResponsivePopover>
  );
}
