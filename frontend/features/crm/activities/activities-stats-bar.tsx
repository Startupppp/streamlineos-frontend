"use client";

import { Phone, Mail, Video, ListTodo, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActivitiesStatsBarProps {
  total: number;
  calls: number;
  emails: number;
  meetings: number;
  pending: number;
  isLoading: boolean;
}

const STATS = [
  { key: "total",    label: "Total",    icon: ListTodo,    color: "text-slate-600"   },
  { key: "calls",    label: "Calls",    icon: Phone,       color: "text-blue-600"    },
  { key: "emails",   label: "Emails",   icon: Mail,        color: "text-purple-600"  },
  { key: "meetings", label: "Meetings", icon: Video,       color: "text-emerald-600" },
  { key: "pending",  label: "Pending",  icon: AlertCircle, color: "text-amber-500"   },
] as const;

type StatKey = (typeof STATS)[number]["key"];

export function ActivitiesStatsBar({
  total,
  calls,
  emails,
  meetings,
  pending,
  isLoading,
}: ActivitiesStatsBarProps) {
  const values: Record<StatKey, number> = { total, calls, emails, meetings, pending };

  return (
    <div className="flex items-center gap-4 flex-wrap text-[11px] px-1 py-1">
      {STATS.map(({ key, label, icon: Icon, color }) => (
        <div key={key} className="flex items-center gap-1.5">
          <Icon className={cn("h-3 w-3", color)} />
          <span className="text-muted-foreground">{label}</span>
          {isLoading ? (
            <span className="font-bold tabular-nums text-muted-foreground/40">—</span>
          ) : (
            <span
              className={cn(
                "font-bold tabular-nums",
                key === "pending" && values[key] > 0
                  ? "text-amber-500"
                  : "text-foreground",
              )}
            >
              {values[key]}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
