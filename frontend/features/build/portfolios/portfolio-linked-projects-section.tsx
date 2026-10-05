"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { TablePagination } from "@/components/ui/table-pagination";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PmPanel,
  PmSection,
  PM_ROW,
} from "@/components/pm-chrome";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import {
  UnlinkProjectButton,
  LinkProjectButton,
} from "./portfolio-detail-helpers";

interface LinkedProject {
  id: number;
  key: string;
  name: string;
  status: string;
}

interface AvailableProject {
  id: number;
  name: string;
}

interface Pager {
  pageNumber: number;
  hasPrevious: boolean;
  goPrevious: () => void;
}

interface PortfolioLinkedProjectsSectionProps {
  linkedProjects: LinkedProject[];
  canManage: boolean;
  availableProjects: AvailableProject[];
  linkProjectId: string;
  onLinkProjectIdChange: (id: string) => void;
  isLinkPending: boolean;
  isUnlinkPending: boolean;
  onLink: () => void;
  onUnlink: (projectId: number) => void;
  hasMore: boolean;
  pager: Pager;
  onNext: () => void;
}

export function PortfolioLinkedProjectsSection({
  linkedProjects,
  canManage,
  availableProjects,
  linkProjectId,
  onLinkProjectIdChange,
  isLinkPending,
  isUnlinkPending,
  onLink,
  onUnlink,
  hasMore,
  pager,
  onNext,
}: PortfolioLinkedProjectsSectionProps) {
  return (
    <PmSection index={1} className="space-y-3">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <p className="text-dense font-medium uppercase tracking-wider text-muted-foreground">
          Linked Projects
          {linkedProjects.length > 0 ? ` (${linkedProjects.length})` : ""}
        </p>
        {canManage && availableProjects.length > 0 ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Select value={linkProjectId} onValueChange={onLinkProjectIdChange}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Link a project…" />
              </SelectTrigger>
              <SelectContent>
                {availableProjects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <LinkProjectButton
              disabled={!linkProjectId}
              isPending={isLinkPending}
              onClick={onLink}
            />
          </div>
        ) : null}
      </div>

      {linkedProjects.length === 0 ? (
        <PmPanel className="flex items-center justify-center p-4">
          <EmptyState
            illustrationPreset="projects"
            title="No linked projects"
            description="Link projects to this portfolio to track them here."
            compact
          />
        </PmPanel>
      ) : (
        <PmPanel>
          {linkedProjects.map((proj) => (
            <div key={proj.id} className={PM_ROW}>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {proj.key}
              </span>
              <Link
                href={`/build/${proj.id}`}
                className={cn(
                  TEXT_ONE_LINE,
                  "flex-1 text-sm font-medium text-foreground hover:text-primary",
                )}
                title={proj.name}
              >
                {proj.name}
              </Link>
              <Badge
                variant="outline"
                className="shrink-0 px-1.5 py-0.5 text-micro"
              >
                {proj.status}
              </Badge>
              {canManage ? (
                <UnlinkProjectButton
                  projectName={proj.name}
                  projectId={proj.id}
                  isPending={isUnlinkPending}
                  onUnlink={onUnlink}
                />
              ) : null}
            </div>
          ))}
          <TablePagination
            mode="cursor"
            rowCount={linkedProjects.length}
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
