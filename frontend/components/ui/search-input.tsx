"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

export interface SearchInputProps
  extends Omit<React.ComponentProps<"input">, "type" | "value" | "onChange"> {
  value: string;
  onValueChange: (value: string) => void;
  onClear?: () => void;
  inputClassName?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput(
    {
      value,
      onValueChange,
      onClear,
      className,
      inputClassName,
      placeholder = "Search…",
      disabled,
      id,
      ...props
    },
    ref,
  ) {
    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      onValueChange(e.target.value);
    }

    function handleClear() {
      onValueChange("");
      onClear?.();
    }

    return (
      <div
        data-slot="search-input"
        className={cn("relative w-full min-w-[12rem]", className)}
      >
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          ref={ref}
          id={id}
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
