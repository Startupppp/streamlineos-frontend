"use client";

import { usePageState } from "@/hooks/api/use-page-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import { ProjectMemberRolesSection } from "@/features/build/settings/project-member-roles-section";
import { TeamRosterSection } from "@/features/build/settings/team-roster-section";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";

const MEMBER_HEADERS = ["Name", "Role", "Added", "Actions"] as const;

interface ProjectSettingsAccessPageProps {
  projectId: number;
}

export function ProjectSettingsAccessPage({ projectId }: ProjectSettingsAccessPageProps) {
  const pageState = usePageState({
    permission: "build:members:view",
    isLoading: false,
    isError: false,
    error: undefined,
  });

  return (
    <PageWrapper title="Access" subtitle="Manage project membership and roles">
      <PmPageShell>
        <PageState
          resolution={pageState}
          loading={
            <DataTableSkeleton
              rows={6}
              headers={MEMBER_HEADERS}
              className="flex-1"
            />
          }
          className="flex-1"
        >
          <div className="flex flex-col gap-4">
            <PmSection index={0}>
              <PmPanel className="p-4" solid>
                <div className="mb-3 border-b border-border pb-3">
                  <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                    Member Roles
                  </h3>
                  <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
                    Project-level roles for each member. Access is governed by
                    org-level permissions.
                  </p>
                </div>
                <ProjectMemberRolesSection projectId={projectId} />
              </PmPanel>
            </PmSection>

            <PmSection index={1}>
              <PmPanel className="p-4" solid>
                <div className="mb-3 border-b border-border pb-3">
                  <h3 className={cn("text-sm font-semibold", TEXT_ONE_LINE)}>
                    Teams &amp; Roster
                  </h3>
                  <p className={cn("mt-0.5 text-xs text-muted-foreground", TEXT_BODY)}>
                    Teams this project belongs to and their effective members.
                  </p>
                </div>
                <TeamRosterSection projectId={projectId} />
              </PmPanel>
            </PmSection>
          </div>
        </PageState>
      </PmPageShell>
    </PageWrapper>
  );
}
