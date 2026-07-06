"use client";

import { useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { RequireModule } from "@/components/auth/require-module";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, AlertTriangle } from "lucide-react";
import { useResourceAllocation } from "@/hooks/api/projects";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";

const PROJECT_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-green-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
];

function getInitials(name: string | null, email: string) {
  if (name) return name.split(" ").map((n) => n[0]).join("").substring(0, 2).toUpperCase();
  return email.substring(0, 2).toUpperCase();
}

export default function ResourceAllocationPage() {
  const { data: entries, isLoading, isError, refetch } = useResourceAllocation();

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const stats = useMemo(() => {
    if (!entries) return { members: 0, openTickets: 0, overloaded: 0 };
    return {
      members: entries.length,
      openTickets: entries.reduce((sum, e) => sum + e.totalOpen, 0),
      overloaded: entries.filter((e) => e.totalOpen > 10).length,
    };
  }, [entries]);

  const maxTickets = entries ? Math.max(...entries.map((e) => e.totalOpen), 1) : 1;

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="Resource Allocation"
        eyebrow="Projects"
        subtitle="Open ticket distribution across team members and active projects"
      >
        {!isLoading && !isError && entries && entries.length > 0 && (
          <StatCardGrid cols={3} className="mb-4">
            <StatCard label="Team Members" value={stats.members} icon={Users} tone="blue" />
            <StatCard label="Open Tickets" value={stats.openTickets} icon={Briefcase} tone="emerald" />
            <StatCard
              label="Overloaded"
              value={stats.overloaded}
              icon={AlertTriangle}
              tone={stats.overloaded > 0 ? "red" : "default"}
            />
          </StatCardGrid>
        )}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        ) : isError ? (
          <ErrorState onRetry={handleRetry} className="flex-1" />
        ) : !entries || entries.length === 0 ? (
          <EmptyState
            title="No assignments yet"
            description="Assign tickets to team members to see workload distribution here."
            action={{ label: "View Projects", href: "/projects" }}
            className="flex-1 min-h-[40vh]"
          />
        ) : (
          <div className="space-y-4">
            {entries.map((entry, idx) => {
              const utilPct = Math.round((entry.totalOpen / maxTickets) * 100);
              return (
                <Card key={entry.user.id} className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="py-2 px-4">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-9 w-9 shrink-0">
                        <AvatarImage src={entry.user.image ?? undefined} />
                        <AvatarFallback className="text-xs">
                          {getInitials(entry.user.name, entry.user.email)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <div>
                            <p className="font-medium text-sm">{entry.user.name ?? entry.user.email}</p>
                            <p className="text-xs text-muted-foreground">{entry.user.email}</p>
                          </div>
                          <Badge
                            variant={
                              entry.totalOpen > 10
                                ? "destructive"
                                : entry.totalOpen > 5
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {entry.totalOpen} open
                          </Badge>
                        </div>
                        <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
                            style={{ width: `${utilPct}%` }}
                          />
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {entry.byProject.map((p, pIdx) => (
                            <div
                              key={p.projectId}
                              className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs bg-muted"
                            >
                              <span
                                className={`h-2 w-2 rounded-full shrink-0 ${PROJECT_COLORS[(pIdx + idx) % PROJECT_COLORS.length]}`}
                              />
                              <span className="font-mono text-[10px] text-muted-foreground">{p.projectKey}</span>
                              <span>{p.projectName}</span>
                              <span className="font-semibold">{p.open}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageWrapper>
    </RequireModule>
  );
}
