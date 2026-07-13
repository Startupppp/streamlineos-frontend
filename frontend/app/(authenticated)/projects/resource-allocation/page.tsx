"use client";

import { useCallback, useMemo } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { RequireModule } from "@/components/auth/require-module";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Briefcase, AlertTriangle } from "lucide-react";
import { useResourceAllocation } from "@/hooks/api/projects";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ResourceAllocationMemberCard } from "@/features/projects/resource-allocation/resource-allocation-member-card";

export default function ResourceAllocationPage() {
  const { data: entries, isLoading, isError, refetch } = useResourceAllocation();

  const handleRetry = useCallback(() => refetch(), [refetch]);

  const stats = useMemo(() => {
    if (!entries) return { members: 0, openTickets: 0, overloaded: 0 };
    return {
      members: entries.length,
      openTickets: entries.reduce((sum, entry) => sum + entry.totalOpen, 0),
      overloaded: entries.filter((entry) => entry.totalOpen > 10).length,
    };
  }, [entries]);

  const maxTickets = entries ? Math.max(...entries.map((entry) => entry.totalOpen), 1) : 1;

  return (
    <RequireModule module="PROJECTS">
      <PageWrapper
        title="Resource Allocation"
        eyebrow="Projects"
        subtitle="Open ticket distribution across team members and active projects"
      >
        <StatCardGrid cols={3} className="mb-3">
          <StatCard
            label="Team Members"
            value={stats.members}
            icon={Users}
            tone="blue"
            isLoading={isLoading}
          />
          <StatCard
            label="Open Tickets"
            value={stats.openTickets}
            icon={Briefcase}
            tone="emerald"
            isLoading={isLoading}
          />
          <StatCard
            label="Overloaded"
            value={stats.overloaded}
            icon={AlertTriangle}
            tone={stats.overloaded > 0 ? "red" : "default"}
            isLoading={isLoading}
          />
        </StatCardGrid>

        <div className="flex flex-1 min-h-0 flex-col">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-[4.25rem] rounded-xl" />
              ))}
            </div>
          ) : isError ? (
            <ErrorState onRetry={handleRetry} className="flex-1" />
          ) : !entries || entries.length === 0 ? (
            <EmptyState
              title="No assignments yet"
              description="Assign tickets to team members to see workload distribution here."
              action={{ label: "View Projects", href: "/projects/all" }}
              className="flex-1"
            />
          ) : (
            <div className="space-y-2">
              {entries.map((entry, index) => (
                <ResourceAllocationMemberCard
                  key={entry.user.id}
                  entry={entry}
                  utilPct={Math.round((entry.totalOpen / maxTickets) * 100)}
                  memberIndex={index}
                />
              ))}
            </div>
          )}
        </div>
      </PageWrapper>
    </RequireModule>
  );
}
