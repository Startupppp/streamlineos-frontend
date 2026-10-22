"use client";

import { useCallback } from "react";
import { Clock, Percent } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { PageState } from "@/components/shared/page-state";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useProjects } from "@/hooks/api/build/projects";
import { useProjectHoursReport } from "@/hooks/api/timesheets-core/reports";
import { formatReportPercent } from "./report-format";

interface ProjectHoursTabProps {
  params: { startDate: string; endDate: string };
  projectId: number | null;
  onProjectChange: (projectId: number) => void;
  enabled: boolean;
}

export function ProjectHoursTab({ params, projectId, onProjectChange, enabled }: ProjectHoursTabProps) {
  const canListProjects = useCan("build:view");
  const { data: projectsData } = useProjects(undefined, { enabled });
  const projects = projectsData?.data ?? [];

  const handleProjectChange = useCallback(
    (value: string) => onProjectChange(Number(value)),
    [onProjectChange],
  );

  return (
    <div className="flex flex-1 min-h-0 flex-col gap-4">
      <Select value={projectId ? String(projectId) : undefined} onValueChange={handleProjectChange}>
        <SelectTrigger className="h-9 w-full sm:w-64" aria-label="Project">
          <SelectValue placeholder={canListProjects ? "Select a project" : "No project access"} />
        </SelectTrigger>
        <SelectContent className="min-w-[var(--radix-select-trigger-width)]">
          {projects.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {projectId === null ? (
        <EmptyState
          illustrationPreset="chart"
          title="Choose a project"
          description="Pick a project to see the hours logged against it in this date range."
          className="min-h-[40dvh]"
        />
      ) : (
        <ProjectHoursBody params={params} projectId={projectId} enabled={enabled} />
      )}
    </div>
  );
}

function ProjectHoursBody({
  params,
  projectId,
  enabled,
}: {
  params: { startDate: string; endDate: string };
  projectId: number;
  enabled: boolean;
}) {
  const { data, isLoading, isError, error, refetch } = useProjectHoursReport(
    { projectId, ...params },
    enabled,
  );
  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const state = usePageState({
    permission: "timesheets:reports:view",
    isLoading: !isError && (isLoading || !data),
    isError,
    error,
  });

  return (
    <PageState
      resolution={state}
      onRetry={handleRetry}
      loading={<StatCardGridSkeleton cols={4} count={4} />}
    >
      {data ? (
        data.totalHours === 0 ? (
          <EmptyState
            illustrationPreset="chart"
            title="No hours logged"
            description="Nobody logged time against this project in this date range."
            className="min-h-[40dvh]"
          />
        ) : (
          <StatCardGrid cols={4}>
            <StatCard label="Total Hours" value={data.totalHours.toFixed(1)} icon={Clock} />
            <StatCard label="Billable Hours" value={data.billableHours.toFixed(1)} icon={Clock} tone="emerald" />
            <StatCard
              label="Non-billable Hours"
              value={data.nonBillableHours.toFixed(1)}
              icon={Clock}
              tone="amber"
            />
            <StatCard
              label="Billable Share"
              value={formatReportPercent(data.billableHours / data.totalHours)}
              icon={Percent}
            />
          </StatCardGrid>
        )
      ) : null}
    </PageState>
  );
}
