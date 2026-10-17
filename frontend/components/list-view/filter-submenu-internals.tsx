"use client";

import { type ChangeEvent, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { Check, Search, CalendarRange } from "lucide-react";
import dynamic from "next/dynamic";

const DatePicker = dynamic(
  () => import("@/components/ui/date-picker").then((m) => ({ default: m.DatePicker })),
  { ssr: false, loading: () => null },
);
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
        "flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm",
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
      <span className="min-w-0 flex-1 break-words text-left leading-5">{label}</span>
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
        <div className="flex h-11 shrink-0 items-center border-b border-border px-4">
          <span className="text-sm font-semibold text-foreground">
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
    <div className="space-y-3 px-4 py-4">
      <div className="flex items-start gap-2 rounded-lg bg-muted/35 px-3 py-2.5 text-xs text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5 shrink-0" />
        <span className={cn("leading-4", hasDate && "font-medium text-foreground")}>
          {hasDate ? "Date range active" : "Choose a start and end date"}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-3">
        <div className="space-y-1.5">
          <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">From</span>
          <DatePicker
            value={dueDateFrom}
            onChange={onDueDateFromChange}
            placeholder="Start date"
            className="w-full text-sm"
          />
        </div>
        <div className="space-y-1.5">
          <span className="text-micro font-medium uppercase tracking-wider text-muted-foreground">To</span>
          <DatePicker
            value={dueDateTo}
            onChange={onDueDateToChange}
            placeholder="End date"
            className="w-full text-sm"
          />
        </div>
      </div>
    </div>
  );
}
