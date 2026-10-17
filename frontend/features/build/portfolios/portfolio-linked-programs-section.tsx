"use client";

import { TablePagination } from "@/components/ui/table-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import {
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import { PortfolioStatusBadge } from "./portfolio-status-badge";

interface LinkedProgram {
  id: number;
  name: string;
  status: string;
}

interface Pager {
  pageNumber: number;
  hasPrevious: boolean;
  goPrevious: () => void;
}

interface PortfolioLinkedProgramsSectionProps {
  linkedPrograms: LinkedProgram[];
  hasMore: boolean;
  pager: Pager;
  onNext: () => void;
}

export function PortfolioLinkedProgramsSection({
  linkedPrograms,
  hasMore,
  pager,
  onNext,
}: PortfolioLinkedProgramsSectionProps) {
  return (
    <PmSection index={2} className="space-y-3">
      <p className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
        Programs
        {linkedPrograms.length > 0 ? ` (${linkedPrograms.length})` : ""}
      </p>
      {linkedPrograms.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustrationPreset="projects"
            title="No linked programs"
            description="Programs assigned to this portfolio will appear here."
            compact
          />
        </PmPanel>
      ) : (
        <PmPanel>
          {linkedPrograms.map((program) => (
            <div key={program.id} className={PM_ROW}>
              <span
                className={cn(
                  TEXT_ONE_LINE,
                  "flex-1 text-sm font-medium text-foreground",
                )}
              >
                {program.name}
              </span>
              <PortfolioStatusBadge status={program.status} />
            </div>
          ))}
          <TablePagination
            mode="cursor"
            rowCount={linkedPrograms.length}
            pageNumber={pager.pageNumber}
            hasMore={hasMore}
            hasPrevious={pager.hasPrevious}
            onNext={onNext}
            onPrevious={pager.goPrevious}
          />
        </PmPanel>
      )}
    </PmSection>
  );
}
