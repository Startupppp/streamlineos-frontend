"use client";

import { useState } from "react";
import Link from "next/link";
import { TrendingUp, UserPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyPersonIllustration } from "@/components/illustrations";
import { cn } from "@/lib/utils";

import { OnboardingInitiateSheet } from "./onboarding-initiate-sheet";
import { useOnboardingStatus, type OnboardingStatus } from "@/hooks/api/hr/onboarding";

function isStalledBadge(row: OnboardingStatus): boolean {
  if (row.percentComplete >= 100) return false;
  if (!row.lastCompletedAt) return false;
  const last = new Date(row.lastCompletedAt).getTime();
  return Date.now() - last > 48 * 60 * 60 * 1000;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type RowStatus = "completed" | "stalled" | "in_progress" | "not_started";

function getRowStatus(row: OnboardingStatus): RowStatus {
  if (row.percentComplete >= 100) return "completed";
  if (isStalledBadge(row)) return "stalled";
  if (row.percentComplete > 0) return "in_progress";
  return "not_started";
}

export function OnboardingList() {
  const { data, isLoading } = useOnboardingStatus();
  const [initiateOpen, setInitiateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-[60px] rounded-2xl" />
        ))}
      </div>
    );
  }

  const rows = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center w-full gap-3">
        <Button
          size="sm"
          className="gap-1.5"
          onClick={() => setInitiateOpen(true)}
          aria-label="Initiate onboarding for an employee"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Initiate Onboarding
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          illustration={<EmptyPersonIllustration className="h-24 w-24" />}
          title="No onboardings in progress"
          description="Use the button above to start onboarding for a new hire."
          compact
        />
      ) : (
        <div className="space-y-2">
          {rows.map((row) => {
            const rowStatus = getRowStatus(row);
            return (
              <Card
                key={row.userId}
                className={cn(
                  "rounded-2xl border border-border/70 bg-card/90 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_32px_-14px_rgba(15,23,42,0.12)] overflow-hidden border-l-4",
                  rowStatus === "completed" && "border-l-emerald-500",
                  (rowStatus === "stalled" || rowStatus === "in_progress") && "border-l-amber-500",
                  rowStatus === "not_started" && "border-l-border"
                )}
              >
                <CardContent className="p-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold",
                        rowStatus === "completed"
                          ? "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400"
                          : rowStatus === "stalled" || rowStatus === "in_progress"
                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {getInitials(row.userName)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <p className="text-sm font-semibold truncate">{row.userName}</p>
                        {rowStatus === "completed" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                          >
                            Completed
                          </Badge>
                        )}
                        {rowStatus === "stalled" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                          >
                            Stalled
                          </Badge>
                        )}
                        {rowStatus === "in_progress" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                          >
                            In Progress
                          </Badge>
                        )}
                        {rowStatus === "not_started" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-semibold shrink-0 px-2 py-0.5 rounded-full bg-muted text-muted-foreground border-border dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700"
                          >
                            Not Started
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={row.percentComplete}
                          className="h-1.5 flex-1 [&>div]:bg-emerald-500"
                        />
                        <span className="text-[11px] font-semibold text-muted-foreground tabular-nums shrink-0">
                          {row.percentComplete}% · {row.completedTasks}/{row.totalTasks}
                        </span>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs gap-1.5 shrink-0 duration-200"
                      asChild
                    >
                      <Link href={`/hr/onboarding/${row.userId}`} aria-label={`View ${row.userName} onboarding`}>
                        <TrendingUp className="h-3.5 w-3.5" />
                        View
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <OnboardingInitiateSheet open={initiateOpen} onOpenChange={setInitiateOpen} />
    </div>
  );
}
