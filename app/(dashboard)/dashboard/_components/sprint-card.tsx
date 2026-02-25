"use client";

import Link from "next/link";
import { Zap, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptySprintIllustration } from "@/components/illustrations";

interface SprintSummary {
  projectId?: number;
  name: string;
  projectName: string;
  progress: number;
  daysRemaining: number;
  completedPoints: number;
  totalPoints: number;
  doneTickets: number;
  inProgressTickets: number;
  todoTickets: number;
}

interface SprintCardProps {
  summary: SprintSummary | undefined;
  isLoading: boolean;
}

export function SprintCard({ summary, isLoading }: SprintCardProps) {
  return (
    <Card className="lg:col-span-3 bg-card border-border shadow-noir">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-foreground flex items-center gap-2">
          <Zap className="h-5 w-5 text-gold" />
          Active Sprint
        </CardTitle>
        {summary?.projectId && (
          <Link href={`/projects/${summary.projectId}`}>
            <Button variant="ghost" size="sm" className="hover:bg-gold/10 hover:text-gold">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-foreground">{summary.name}</h3>
              <p className="text-sm text-muted-foreground">{summary.projectName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progress</span>
                <span className="font-medium text-gold">{summary.progress}%</span>
              </div>
              <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all gold-gradient"
                  style={{ width: `${summary.progress}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Days Left</p>
                <p className={`text-lg font-bold ${summary.daysRemaining <= 2 ? "text-red-500" : "text-foreground"}`}>
                  {summary.daysRemaining}
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/50 border border-border">
                <p className="text-xs text-muted-foreground">Points</p>
                <p className="text-lg font-bold text-foreground">
                  {summary.completedPoints}/{summary.totalPoints}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Done
                </span>
                <span className="font-medium">{summary.doneTickets}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  In Progress
                </span>
                <span className="font-medium">{summary.inProgressTickets}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-400" />
                  To Do
                </span>
                <span className="font-medium">{summary.todoTickets}</span>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            illustration={<EmptySprintIllustration />}
            title="No active sprint"
            description="Start a sprint in your project to see progress here."
          />
        )}
      </CardContent>
    </Card>
  );
}
