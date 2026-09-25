"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

/**
 * Shared width contract: fills the row on mobile, capped on tablet and up so a
 * lone search never stretches across a wide page. Opt out with `fill` when the
 * search sits inside a panel it is meant to span (wide dialog, sheet, drawer).
 */
export const SEARCH_INPUT_WIDTH = "w-full min-w-[12rem]";
export const SEARCH_INPUT_MAX_WIDTH = "sm:max-w-xs lg:max-w-sm";

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  /**
   * Enter pressed in the field. Debounced searches use it to publish the typed
   * value at once instead of waiting out the timer; the default is still a
   * trailing debounce, so this never turns into a request per keystroke.
   */
  onSubmitSearch?: () => void;
  inputClassName?: string;
  /** Span the container instead of capping at the shared filter max-width. */
  fill?: boolean;
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
      // A search row often sits inside a form; Enter must search, not submit.
      e.preventDefault();
      onSubmitSearch?.();
    }

    function handleClear() {
      onValueChange("");
      onClear?.();
    }

    return (
      <div
        data-slot="search-input"
        className={cn(
          "relative",
          SEARCH_INPUT_WIDTH,
          !fill && SEARCH_INPUT_MAX_WIDTH,
          className,
        )}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          id={id}
          suppressHydrationWarning
          type="search"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "min-w-0 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden",
            inputClassName,
          )}
          {...props}
          // After the spread: a caller's own onKeyDown is chained inside
          // handleKeyDown, never allowed to replace it.
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
      </div>
    );
  },
);
