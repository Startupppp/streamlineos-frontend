"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Clock } from "lucide-react";
import { useHrOnboardingStatus } from "@/lib/api/hooks/hr/dashboard";
import Link from "next/link";

export function OnboardingStatusWidget() {
  const { data, isLoading } = useHrOnboardingStatus();

  return (
    <Card>
      <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          <CardTitle className="text-sm font-medium">Onboarding Status</CardTitle>
        </div>
        <Link
          href="/hr/onboarding"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View all
        </Link>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            {[1, 2].map((i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="h-2 flex-1 rounded-full" />
                <Skeleton className="h-3 w-8" />
              </div>
            ))}
          </div>
        ) : !data || data.total === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">
            No onboarding in progress
          </p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1 text-amber-500">
                <Clock className="h-3 w-3" />
                {data.inProgress} in progress
              </span>
              <span className="flex items-center gap-1 text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                {data.completed} completed
              </span>
              <span className="ml-auto font-medium text-foreground">
                {data.completionPct}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${data.completionPct}%` }}
              />
            </div>
            {data.newHires.length > 0 && (
              <div className="space-y-2 mt-1">
                {data.newHires.map((hire) => (
                  <div key={hire.userId} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{hire.name}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="h-1 w-16 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${hire.pct}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-7 text-right">
                        {hire.pct}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
