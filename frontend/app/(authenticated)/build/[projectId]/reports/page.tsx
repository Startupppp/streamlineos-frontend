"use client";

import { use } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { VelocitySection } from "@/features/build/reports/velocity-section";
import { BurnupSection } from "@/features/build/reports/burnup-section";
import { CfdSection } from "@/features/build/reports/cfd-section";
import { CriticalPathSection } from "@/features/build/reports/critical-path-section";
import { CycleTimeSection } from "@/features/build/reports/cycle-time-section";
import { LeadTimeSection } from "@/features/build/reports/lead-time-section";
import { PmPageShell, PmSection } from "@/features/build/shared/pm-chrome";

export default function ProjectReportsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId: projectIdStr } = use(params);
  const projectId = Number(projectIdStr);

  return (
    <PageWrapper
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
