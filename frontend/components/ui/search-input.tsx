"use client";

import * as React from "react";
import { Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export const SEARCH_INPUT_WIDTH = "w-full min-w-[12rem]";
export const SEARCH_INPUT_MAX_WIDTH = "sm:max-w-xs lg:max-w-sm";

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  onSubmitSearch?: () => void;
  inputClassName?: string;
  fill?: boolean;
  compact?: boolean;
  searching?: boolean;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onValueChange,
      onClear,
      onSubmitSearch,
      className,
      inputClassName,
      placeholder = "Search…",
      disabled,
      fill = false,
      compact = false,
      searching = false,
      id,
      ...props
    },
    ref,
  ) {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onValueChange(e.target.value);
    }

    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      props.onKeyDown?.(e);
      if (e.key !== "Enter" || e.defaultPrevented) return;
      e.preventDefault();
      onSubmitSearch?.();
    }

    function handleClear() {
      onValueChange("");
      onClear?.();
    }

    const limit = props.maxLength;
    const atLimit = !compact && typeof limit === "number" && limit > 0 && value.length >= limit;

    return (
      <div
        data-slot="search-input"
        className={cn(
          "relative",
          SEARCH_INPUT_WIDTH,
          !fill && SEARCH_INPUT_MAX_WIDTH,
          className,
          compact &&
            "!size-9 !min-w-9 !max-w-9 !flex-none !basis-9 overflow-hidden",
        )}
      >
        {React.createElement(searching ? Loader2 : Search, {
          className: cn(
            "pointer-events-none absolute top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground",
            compact ? "left-1/2 -translate-x-1/2" : "left-3",
            searching && "animate-spin motion-reduce:animate-none",
          ),
          "aria-hidden": true,
        })}
        <Input
          ref={ref}
          id={id}
          suppressHydrationWarning
          type="search"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          aria-busy={searching || undefined}
          className={cn(
            "min-w-0 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            inputClassName,
            compact &&
              "absolute inset-0 !size-9 !min-w-9 !max-w-9 !p-0 text-transparent placeholder:text-transparent",
          )}
          {...props}
          onKeyDown={handleKeyDown}
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            disabled={disabled}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        ) : null}
        {atLimit ? (
          <p
            role="status"
            className="absolute left-0 top-full z-20 mt-1 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-muted-foreground shadow-sm"
          >
            Search is limited to {limit} characters
          </p>
        ) : null}
      </div>
    );
  },
);
