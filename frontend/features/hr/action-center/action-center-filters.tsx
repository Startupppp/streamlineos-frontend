"use client";

import { useState } from "react";
import { Check, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  ResponsivePopover,
  ResponsivePopoverContent,
  ResponsivePopoverTrigger,
} from "@/components/ui/responsive-popover";
import { cn } from "@/lib/utils";
import {
  ACTION_CENTER_FACETS,
  type ActionCenterFacet,
  type ActionCenterFilterState,
} from "@/features/hr/action-center/queue-item";

interface ActionCenterFiltersProps {
  state: ActionCenterFilterState;
  counts: Record<ActionCenterFacet | "all", number>;
  cutoffAvailable: boolean;
  cutoffCount: number;
  onFacetChange: (facet: ActionCenterFacet | "all") => void;
  onCutoffToggle: () => void;
}

export function ActionCenterFilters({
  state,
  counts,
  cutoffAvailable,
  cutoffCount,
  onFacetChange,
  onCutoffToggle,
}: ActionCenterFiltersProps) {
  const [open, setOpen] = useState(false);

  function handleCutoffToggle(): void {
    onCutoffToggle();
    setOpen(false);
  }

  return (
    <div className="flex items-center gap-2">
      <div
        role="group"
        aria-label="Filter by request type"
        className="hidden items-center gap-1 sm:flex"
      >
        {ACTION_CENTER_FACETS.map((facet) => (
          <FacetButton
            key={facet.value}
            value={facet.value}
            label={facet.label}
            count={counts[facet.value]}
            active={state.facet === facet.value}
            onSelect={onFacetChange}
          />
        ))}
      </div>

      {cutoffAvailable ? (
        <Button
          type="button"
          variant={state.onlyCutoff ? "secondary" : "outline"}
          size="sm"
          aria-pressed={state.onlyCutoff}
          onClick={onCutoffToggle}
          className="hidden h-8 shrink-0 text-dense sm:inline-flex"
        >
          Affects cutoff
          <span className="ml-1 tabular-nums">{cutoffCount}</span>
        </Button>
      ) : null}

      <ResponsivePopover open={open} onOpenChange={setOpen}>
        <ResponsivePopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-9 min-h-9 shrink-0 gap-1.5 sm:hidden"
            aria-label="Filters"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span className="truncate">
              {ACTION_CENTER_FACETS.find(
                (facet) => facet.value === state.facet,
              )?.label ?? "All types"}
            </span>
          </Button>
        </ResponsivePopoverTrigger>
        <ResponsivePopoverContent align="start" title="Filters" className="w-56 p-1">
          <div role="menu" aria-label="Filters">
            {ACTION_CENTER_FACETS.map((facet) => (
              <FacetMenuItem
                key={facet.value}
                value={facet.value}
                label={facet.label}
                count={counts[facet.value]}
                active={state.facet === facet.value}
                onSelect={onFacetChange}
                onSelected={setOpen}
              />
            ))}
            {cutoffAvailable ? (
              <>
                <div className="-mx-1 my-1 h-px bg-border" />
                <button
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={state.onlyCutoff}
                  onClick={handleCutoffToggle}
                  className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-dense outline-none hover:bg-accent"
                >
                  <span className={cn("h-3.5 w-3.5", !state.onlyCutoff && "opacity-0")}>
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="flex-1 text-left">Affects cutoff</span>
                  <span className="tabular-nums">{cutoffCount}</span>
                </button>
              </>
            ) : null}
          </div>
        </ResponsivePopoverContent>
      </ResponsivePopover>
    </div>
  );
}

function FacetButton({
  value,
  label,
  count,
  active,
  onSelect,
}: {
  value: ActionCenterFacet | "all";
  label: string;
  count: number;
  active: boolean;
  onSelect: (facet: ActionCenterFacet | "all") => void;
}) {
  function handleClick(): void {
    onSelect(value);
  }

  return (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      aria-pressed={active}
      onClick={handleClick}
      className="h-8 text-dense"
    >
      {label}
      <span className="ml-1 tabular-nums text-muted-foreground">{count}</span>
    </Button>
  );
}

function FacetMenuItem({
  value,
  label,
  count,
  active,
  onSelect,
  onSelected,
}: {
  value: ActionCenterFacet | "all";
  label: string;
  count: number;
  active: boolean;
  onSelect: (facet: ActionCenterFacet | "all") => void;
  onSelected: (open: boolean) => void;
}) {
  function handleClick(): void {
    onSelect(value);
    onSelected(false);
  }

  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onClick={handleClick}
      className="flex w-full items-center gap-2 rounded-sm px-2 py-2 text-dense outline-none hover:bg-accent"
    >
      <span className={cn("h-3.5 w-3.5", !active && "opacity-0")}>
        <Check className="h-3.5 w-3.5" />
      </span>
      <span className="flex-1 text-left">{label}</span>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
