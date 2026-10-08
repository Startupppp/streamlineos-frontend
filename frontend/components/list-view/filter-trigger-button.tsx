"use client";

import { forwardRef, type ComponentPropsWithoutRef, type ChangeEvent } from "react";
import { Search } from "lucide-react";
import { SlidersHorizontalIcon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { cn } from "@/lib/utils";

type FilterTriggerButtonProps = Omit<
  ComponentPropsWithoutRef<typeof AnimatedIconButton>,
  "icon" | "iconSize" | "children"
> & {
  activeFilterCount: number;
  label?: string;
  showLabelOnMobile?: boolean;
  iconOnly?: boolean;
  /** Keep the mobile label while using the compact icon treatment on desktop. */
  desktopIconOnly?: boolean;
};

export const FilterTriggerButton = forwardRef<
  HTMLButtonElement,
  FilterTriggerButtonProps
>(function FilterTriggerButton(
  {
    activeFilterCount,
    label = "Add filter",
    showLabelOnMobile = false,
    iconOnly = false,
    desktopIconOnly = false,
    className,
    ...props
  },
  ref,
) {
  return (
    <AnimatedIconButton
      ref={ref}
      variant="outline"
      size="sm"
      {...props}
      icon={SlidersHorizontalIcon}
      iconSize={14}
      className={cn(
        "relative size-9 shrink-0 gap-1 p-0 text-sm font-normal",
        !iconOnly && !desktopIconOnly && "md:h-9 md:w-auto md:px-2",
        !iconOnly && desktopIconOnly && "h-9 w-auto px-2 lg:size-9 lg:p-0",
        "data-[state=open]:border-primary data-[state=open]:focus-visible:border-primary",
        className,
      )}
      aria-label={
        activeFilterCount > 0
          ? `${label} (${activeFilterCount} active)`
          : label
      }
    >
      {!iconOnly ? (
        <span
          className={cn(
            !showLabelOnMobile && "hidden md:inline",
            desktopIconOnly && "lg:hidden",
          )}
        >
          {label}
        </span>
      ) : null}
      {activeFilterCount > 0 ? (
        <span
          className={cn(
            "absolute -right-1 -top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-0.5 text-micro font-normal text-primary-foreground",
            !desktopIconOnly && "md:static md:ml-0.5 md:h-4 md:min-w-4 md:px-1",
          )}
        >
          {activeFilterCount}
        </span>
      ) : null}
    </AnimatedIconButton>
  );
});

export function MobileFilterSearch({
  value,
  onValueChange,
}: {
  value: string;
  onValueChange: (value: string) => void;
}) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onValueChange(e.target.value);
  }

  return (
    <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        type="search"
        value={value}
        onChange={handleChange}
        placeholder="Filter by…"
        className="h-full flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        aria-label="Search filter options"
      />
    </div>
  );
}
