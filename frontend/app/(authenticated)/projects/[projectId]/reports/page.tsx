"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { VelocitySection } from "@/features/projects/reports/velocity-section";
import { BurnupSection } from "@/features/projects/reports/burnup-section";
import { CfdSection } from "@/features/projects/reports/cfd-section";
import { CriticalPathSection } from "@/features/projects/reports/critical-path-section";
import { CycleTimeSection } from "@/features/projects/reports/cycle-time-section";
import { LeadTimeSection } from "@/features/projects/reports/lead-time-section";
import { PmPageShell, PmSection } from "@/features/projects/shared/pm-chrome";

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  return (
    <PageWrapper
      eyebrow="Project"
      title="Agile Reports"
      subtitle="Velocity, burnup, and cumulative flow for this project"
    >
      <PmPageShell>
        <PmSection index={0}>
          <div className="grid gap-3 lg:grid-cols-2">
            <VelocitySection projectId={projectId} />
            <BurnupSection projectId={projectId} />
          </div>
        </PmSection>
        <PmSection index={1}>
          <CfdSection projectId={projectId} />
        </PmSection>
        <PmSection index={2}>
          <div className="grid gap-3 lg:grid-cols-2">
            <CycleTimeSection projectId={projectId} />
            <LeadTimeSection projectId={projectId} />
          </div>
        </PmSection>
        <PmSection index={3}>
          <CriticalPathSection projectId={projectId} />
        </PmSection>
      </PmPageShell>
    </PageWrapper>
  );
}
