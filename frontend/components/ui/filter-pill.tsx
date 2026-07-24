"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface FilterPillProps
  extends Omit<React.ComponentProps<"button">, "onClick"> {
  active?: boolean;
  count?: number | null;
  dotClassName?: string;
  activeClassName?: string;
  onClick?: () => void;
}

export const FilterPill = React.forwardRef<HTMLButtonElement, FilterPillProps>(
  function FilterPill(
    {
      active = false,
      count,
      dotClassName,
      activeClassName,
      className,
      children,
      onClick,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          "h-8 shrink-0 inline-flex items-center gap-1.5 rounded-full border px-3 text-xs font-medium outline-none transition-all duration-200 press-scale focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring",
          active
            ? (activeClassName ??
                "border-primary bg-primary text-primary-foreground")
            : "border-input bg-card text-muted-foreground hover:border-primary/40 hover:bg-muted/50 hover:text-foreground",
          className,
        )}
        {...props}
      >
        {dotClassName && (
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              active ? "bg-current opacity-70" : dotClassName,
            )}
          />
        )}
        {children}
        {count != null && (
          <span
            className={cn(
              "min-w-[18px] rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold leading-none",
              active
                ? "bg-white/20 dark:bg-black/20"
                : "bg-muted text-muted-foreground",
            )}
          >
            {count}
          </span>
        )}
      </button>
    );
  },
);

export function FilterPillGroup({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-nowrap items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [&>*]:shrink-0",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
