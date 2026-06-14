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

import { OnboardingInitiateSheet } from "./onboarding-initiate-sheet";
import { useOnboardingStatus, type OnboardingStatus } from "@/lib/api/hooks/hr/onboarding";

function isStalledBadge(row: OnboardingStatus): boolean {
  if (row.percentComplete >= 100) return false;
  if (!row.lastCompletedAt) return false;
  const last = new Date(row.lastCompletedAt).getTime();
  return Date.now() - last > 48 * 60 * 60 * 1000;
}

export function OnboardingList() {
  const { data, isLoading } = useOnboardingStatus();
  const [initiateOpen, setInitiateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-2 pt-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16" />
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
          className="h-8 gap-1.5"
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
          {rows.map((row) => (
            <Card key={row.userId}>
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                      <p className="text-sm font-medium truncate">{row.userName}</p>
                      {row.percentComplete === 100 && (
                        <Badge className="text-[10px] shrink-0" variant="default">
                          Complete
                        </Badge>
                      )}
                      {isStalledBadge(row) && (
                        <Badge className="text-[10px] shrink-0" variant="destructive">
                          Stalled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={row.percentComplete} className="h-1.5 flex-1" />
                      <span className="text-[11px] text-muted-foreground shrink-0">
                        {row.completedTasks}/{row.totalTasks}
                      </span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs shrink-0"
                    asChild
                  >
                    <Link href={`/hr/onboarding/${row.userId}`} aria-label={`View ${row.userName} onboarding`}>
                      <TrendingUp className="h-3.5 w-3.5 mr-1" />
                      View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <OnboardingInitiateSheet open={initiateOpen} onOpenChange={setInitiateOpen} />
    </div>
  );
}
