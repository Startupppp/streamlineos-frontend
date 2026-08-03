"use client";

import { useMemo } from "react";
import { format, parseISO, isAfter, isSameDay, startOfDay } from "date-fns";
import { EmptyState } from "@/components/ui/empty-state";
import type { Holiday } from "@/hooks/api/hr/holidays";
import { HolidayItem } from "./holiday-item";

interface UpcomingViewProps {
  holidays: Holiday[];
  canManage: boolean;
  onEdit: (h: Holiday) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function UpcomingView({ holidays, canManage, onEdit, onDelete, onAdd }: UpcomingViewProps) {
  const upcoming = useMemo(() => {
    const today = startOfDay(new Date());
    return [...holidays]
      .filter((h) => isAfter(parseISO(h.date), today) || isSameDay(parseISO(h.date), today))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [holidays]);

  if (upcoming.length === 0) {
    return (
      <EmptyState
        illustrationPreset="calendar"
        illustrationSize="md"
        title="No upcoming holidays"
        action={canManage ? { label: "Add Holiday", onClick: onAdd } : undefined}
        compact
        className="rounded-lg border border-border bg-muted/20 py-10"
      />
    );
  }

  const grouped = upcoming.reduce<Record<string, Holiday[]>>((acc, h) => {
    const key = format(parseISO(h.date), "MMMM yyyy");
    if (!acc[key]) acc[key] = [];
    acc[key].push(h);
    return acc;
  }, {});

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([month, items]) => (
        <div key={month}>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">{month}</h3>
          <div className="space-y-2">
            {items.map((h) => (
              <HolidayItem key={h.id} holiday={h} canManage={canManage} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
