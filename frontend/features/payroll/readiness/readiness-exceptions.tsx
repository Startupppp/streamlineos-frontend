"use client";

import Link from "next/link";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { statusToneClasses } from "@/lib/design-tokens";
import { cn } from "@/lib/utils";
import type { ReadinessException } from "@/hooks/api/payroll/readiness-schema";

interface ReadinessExceptionsProps {
  exceptions: ReadinessException[];
}

export function ReadinessExceptions({ exceptions }: ReadinessExceptionsProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3" aria-label="Payroll readiness exceptions">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Needs attention</h3>
        <span className="text-dense text-muted-foreground tabular-nums">{exceptions.length}</span>
      </div>
      {exceptions.length === 0 ? (
        <p className="text-dense text-muted-foreground">Nothing is missing from this pay period&apos;s inputs.</p>
      ) : (
        <ul className="divide-y divide-border">
          {exceptions.map((exception, index) => {
            const tone = statusToneClasses(exception.severity === "blocker" ? "danger" : "warning");
            return (
              <li key={`${exception.code}-${exception.period?.periodId ?? index}`} className="flex items-start gap-3 py-2.5">
                <span className={cn("mt-1 inline-block h-2 w-2 shrink-0 rounded-full", tone.fill)} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-dense text-foreground leading-snug">{exception.message}</p>
                  <p className="text-micro text-muted-foreground">
                    {exception.severity === "blocker" ? "Blocker" : "Warning"} · {exception.owner.label}
                    {exception.period ? ` · changed ${format(parseISO(exception.period.changedAt), "MMM d, h:mm a")}` : ""}
                  </p>
                </div>
                {exception.action ? (
                  <Button size="sm" variant="outline" className="h-7 shrink-0 text-xs" asChild>
                    <Link href={exception.action.href}>{exception.action.label}</Link>
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
