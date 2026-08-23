"use client";

import { type ChangeEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Check, Search, CalendarRange } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { StatusConfigDot } from "@/components/ui/status-config-dot";
import { getStatusEntry, type StatusConfigEntry } from "@/lib/status-config";
import { categoryTitle, type FilterCategory, type StatusFilterOption } from "./filter-types";

export function OptionRow({
  active,
  label,
  color,
  dotClassName,
  leading,
  onClick,
}: {
  active: boolean;
  label: string;
  color?: string | null;
  dotClassName?: string;
  leading?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm",
        "transition-colors motion-reduce:transition-none",
        "hover:bg-accent hover:text-accent-foreground",
        "focus-visible:outline-none focus-visible:bg-accent",
      )}
    >
      <Check
        className={cn(
          "h-4 w-4 shrink-0 transition-opacity motion-reduce:transition-none",
          active ? "opacity-100" : "opacity-0",
        )}
      />
      {leading}
      {!leading && color ? (
        <span
          className="h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : !leading && dotClassName ? (
        <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", dotClassName)} />
      ) : null}
      <span className="min-w-0 flex-1 truncate text-left">{label}</span>
    </button>
  );
}

export function StatusFilterDot({
  status,
  config,
  className = "h-2.5 w-2.5 shrink-0 rounded-full",
}: {
  status: StatusFilterOption;
  config: Record<string, StatusConfigEntry>;
  className?: string;
}) {
  const entry = getStatusEntry(config, status.name);
  return (
    <StatusConfigDot
      entry={status.color ? { ...entry, color: status.color } : entry}
      className={className}
    />
  );
}

export function FilterMenuSearch({
  value,
  onValueChange,
  placeholder,
}: {
  value: string;
  onValueChange: (v: string) => void;
  placeholder: string;
}) {
  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    onValueChange(e.target.value);
  }

  return (
    <div className="flex h-10 items-center gap-2 border-b border-border px-3">
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <input
        autoFocus
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  );
}

export function PanelShell({
  category,
  children,
  onKeyDown,
  containerRef,
  withSearch = false,
  showTitle = true,
  className,
}: {
  category: FilterCategory;
  children: ReactNode;
  onKeyDown: (e: KeyboardEvent) => void;
  containerRef: RefObject<HTMLDivElement | null>;
  withSearch?: boolean;
  showTitle?: boolean;
  className?: string;
}) {
  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className={cn("flex w-[260px] flex-col outline-none", className)}
    >
      {showTitle && !withSearch ? (
        <div className="flex h-10 shrink-0 items-center border-b border-border px-3">
          <span className="text-sm font-medium text-foreground">
            {categoryTitle(category)}
          </span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

export function EmptyHint({ message }: { message: string }) {
  return (
    <p className="px-3 py-6 text-center text-sm text-muted-foreground">{message}</p>
  );
}

interface FilterDatesPanelProps {
  dueDateFrom: string;
  dueDateTo: string;
  onDueDateFromChange: (v: string) => void;
  onDueDateToChange: (v: string) => void;
}

export function FilterDatesPanel({
  dueDateFrom,
  dueDateTo,
  onDueDateFromChange,
  onDueDateToChange,
}: FilterDatesPanelProps) {
  const hasDate = Boolean(dueDateFrom || dueDateTo);
  return (
    <div className="px-3 py-3">
      <div className="mb-2.5 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
        {hasDate ? (
          <span className="font-medium text-foreground">Range active</span>
        ) : (
          <span>Select a date range</span>
        )}
      </div>
      <div className="grid grid-cols-1 gap-2.5">
        <DatePicker
          value={dueDateFrom}
          onChange={onDueDateFromChange}
          placeholder="From"
          className="w-full text-sm"
        />
        <DatePicker
          value={dueDateTo}
          onChange={onDueDateToChange}
          placeholder="To"
          className="w-full text-sm"
        />
      </div>
    </div>
  );
}
