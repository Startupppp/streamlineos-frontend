"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { VelocitySection } from "@/features/projects/reports/velocity-section";
import { BurnupSection } from "@/features/projects/reports/burnup-section";
import { CfdSection } from "@/features/projects/reports/cfd-section";
import { CriticalPathSection } from "@/features/projects/reports/critical-path-section";
import { CycleTimeSection } from "@/features/projects/reports/cycle-time-section";
import { LeadTimeSection } from "@/features/projects/reports/lead-time-section";

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  return (
    <PageWrapper
      eyebrow="Projects"
      title="Agile Reports"
      subtitle="Velocity, burnup, and cumulative flow for this project"
      backHref={`/projects/${projectIdStr}`}
    >
      <div className="space-y-3">
        <div className="grid gap-3 lg:grid-cols-2">
          <VelocitySection projectId={projectId} />
          <BurnupSection projectId={projectId} />
        </div>
        <CfdSection projectId={projectId} />
        <div className="grid gap-3 lg:grid-cols-2">
          <CycleTimeSection projectId={projectId} />
          <LeadTimeSection projectId={projectId} />
        </div>
        <CriticalPathSection projectId={projectId} />
      </div>
    </PageWrapper>
  );
}
