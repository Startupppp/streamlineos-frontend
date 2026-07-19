"use client";

import * as React from "react";
import Link from "next/link";
import { format, isValid } from "date-fns";
import { cn } from "@/lib/utils";
import type { WorkspaceHit } from "@/hooks/api/workspace-search";

const ENTITY_COLORS: Record<string, string> = {
  project: "bg-primary/10 text-primary dark:bg-primary/20",
  ticket: "bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
  lead: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30",
  deal: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  contact: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  client: "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-500/10 dark:text-cyan-300 dark:border-cyan-500/30",
};

interface SearchHitCardProps {
  hit: WorkspaceHit;
  className?: string;
}

function formatFreshness(value: string): string | null {
  const date = new Date(value);
  if (!isValid(date)) return null;
  return format(date, "MMM d, yyyy");
}

export function SearchHitCard({ hit, className }: SearchHitCardProps) {
  const colorClass = ENTITY_COLORS[hit.entityType] ?? ENTITY_COLORS.ticket;
  const freshness = formatFreshness(hit.freshness);

  return (
    <div className={cn("bg-card border border-border rounded-xl shadow-sm p-3 flex flex-col gap-1.5 hover:shadow-md transition-shadow", className)}>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "inline-flex items-center rounded-full border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide shrink-0",
            colorClass,
          )}
        >
          {hit.entityType}
        </span>
        <Link
          href={hit.urlPath}
          className="text-sm font-medium text-foreground hover:text-primary truncate min-w-0 transition-colors"
        >
          {hit.title}
        </Link>
      </div>
      {hit.snippet && (
        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{hit.snippet}</p>
      )}
      {freshness && (
        <p className="text-[10px] text-muted-foreground/70">{freshness}</p>
      )}
    </div>
  );
}
