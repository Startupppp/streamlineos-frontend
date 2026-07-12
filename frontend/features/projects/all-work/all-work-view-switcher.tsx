"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { List, Table2, LayoutGrid } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type AllWorkView = "list" | "table" | "board";

export const VIEW_OPTIONS: {
  value: AllWorkView;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}[] = [
  { value: "list", icon: List, label: "List" },
  { value: "table", icon: Table2, label: "Table" },
  { value: "board", icon: LayoutGrid, label: "Board" },
];

export function parseView(raw: string | null): AllWorkView {
  if (raw === "table" || raw === "board") return raw;
  return "list";
}

export function AllWorkSkeleton({ view }: { view: AllWorkView }) {
  if (view === "board") {
    return (
      <div className="flex gap-4 px-4 pb-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-64 flex-shrink-0 space-y-2">
            <Skeleton className="h-8 w-full rounded-lg" />
            {Array.from({ length: 3 }).map((__, j) => (
              <Skeleton key={j} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="space-y-1.5 px-4 pb-4">
      <Skeleton className="h-8 w-full rounded" />
      {Array.from({ length: 12 }).map((_, i) => (
        <Skeleton key={i} className="h-8 w-full rounded" />
      ))}
    </div>
  );
}

interface AllWorkViewSwitcherProps {
  activeView: AllWorkView;
  onViewChange: (v: AllWorkView) => void;
}

export function AllWorkViewSwitcher({ activeView, onViewChange }: AllWorkViewSwitcherProps) {
  function handleChange(value: string) {
    if (value === "list" || value === "table" || value === "board") {
      onViewChange(value);
    }
  }

  return (
    <Select value={activeView} onValueChange={handleChange}>
      <SelectTrigger className="h-8 w-[110px] shrink-0 bg-card text-xs" aria-label="Select view">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {VIEW_OPTIONS.map((v) => (
          <SelectItem key={v.value} value={v.value} className="text-xs">
            <span className="flex items-center gap-1.5">
              <v.icon className="h-3.5 w-3.5 text-muted-foreground" />
              {v.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
