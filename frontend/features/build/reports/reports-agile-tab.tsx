"use client";

import { PmSection } from "@/components/pm-chrome";
import { VelocitySection } from "./velocity-section";
import { BurnupSection } from "./burnup-section";
import { CfdSection } from "./cfd-section";
import { CriticalPathSection } from "./critical-path-section";
import { CycleTimeSection } from "./cycle-time-section";
import { LeadTimeSection } from "./lead-time-section";
import { ReportsExportButton } from "./reports-export-button";
import type { FilterEnvelopeV1 } from "@/lib/filter-envelope/filter-envelope-v1";

interface ReportsAgileTabProps {
  projectId: number;
  filterEnvelope?: FilterEnvelopeV1;
}

export function ReportsAgileTab({ projectId, filterEnvelope }: ReportsAgileTabProps) {
  return (
    <>
      <div className="flex justify-end">
        <ReportsExportButton projectId={projectId} />
      </div>
      <PmSection index={0}>
        <div className="grid gap-3 lg:grid-cols-2">
          <VelocitySection projectId={projectId} filterEnvelope={filterEnvelope} />
          <BurnupSection projectId={projectId} filterEnvelope={filterEnvelope} />
        </div>
      </PmSection>
      <PmSection index={1}>
        <CfdSection projectId={projectId} filtersActive={filterEnvelope !== undefined} />
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
    </>
  );
}
