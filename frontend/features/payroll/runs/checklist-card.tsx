"use client";

import Link from "next/link";
import { CheckCircle, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PayrollChecklistItem } from "@/types/payroll/runs";

interface ChecklistCardProps {
  items: PayrollChecklistItem[];
}

export function ChecklistCard({ items }: ChecklistCardProps) {
  const doneCount = items.filter((i) => i.done).length;
  const percent = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Payroll Checklist</h3>
        <span className="text-dense text-muted-foreground tabular-nums">
          {doneCount}/{items.length}
        </span>
      </div>

      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-status-success-fill rounded-full transition-[width] duration-[400ms] ease-in-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="space-y-0 divide-y divide-border">
        {items.map((item) => {
          const inner = (
            <div
              className={cn(
                "flex items-start gap-2.5 py-2 text-dense",
                item.href && "hover:bg-muted/20 -mx-1 px-1 rounded",
              )}
            >
              {item.done ? (
                <CheckCircle className="h-3.5 w-3.5 text-status-success-ink shrink-0 mt-0.5" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p
                  className={cn(
                    "font-medium leading-snug",
                    item.done ? "text-muted-foreground line-through" : "text-foreground",
                  )}
                >
                  {item.label}
                </p>
                {!item.done && item.detail && (
                  <p className="text-micro text-muted-foreground mt-0.5 leading-snug">
                    {item.detail}
                  </p>
                )}
              </div>
            </div>
          );

          if (item.href && !item.done) {
            return (
              <Link key={item.key} href={item.href} className="block">
                {inner}
              </Link>
            );
          }
          return <div key={item.key}>{inner}</div>;
        })}
      </div>
    </div>
  );
}
