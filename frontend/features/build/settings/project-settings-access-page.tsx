"use client";

import { useState, useCallback, useRef } from "react";
import { Plus } from "lucide-react";
import { usePageState } from "@/hooks/api/use-page-state";
import { useCan } from "@/hooks/api/access";
import { useProjectMembers } from "@/hooks/api/build/project-members";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { PageState } from "@/components/shared/page-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { PmPageShell, PmPanel, PmSection } from "@/components/pm-chrome";
import { ProjectMemberRolesSection } from "@/features/build/settings/project-member-roles-section";
import { TeamRosterSection } from "@/features/build/settings/team-roster-section";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { AddProjectMemberDialog } from "./add-project-member-dialog";
import { cn } from "@/lib/utils";
import { TEXT_ONE_LINE, TEXT_BODY } from "@/lib/text-overflow";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { useBuildListFilters } from "@/features/build/shared/use-build-list-filters";
import { useBuildListKeyboard } from "@/hooks/common/use-build-list-keyboard";

const MEMBER_HEADERS = ["Name", "Role", "Added", "Actions"] as const;

interface ProjectSettingsAccessPageProps {
  projectId: number;
}

export function ProjectSettingsAccessPage({
  projectId,
}: ProjectSettingsAccessPageProps) {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const listFilters = useBuildListFilters({ withSearch: true });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const canManage = useCan("build:manage");
  const {
    data: members,
    isLoading,
    isError,
    error,
    refetch,
  } = useProjectMembers(projectId, {
    search: listFilters.debouncedSearch || undefined,
  });

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);
  const handleOpenAddDialog = useCallback(() => setAddDialogOpen(true), []);

  const handleKeyboardClear = useCallback(() => {
    listFilters.clearAll();
  }, [listFilters]);

  const handleKeyboardOpen = useCallback((_index: number) => {}, []);

  useBuildListKeyboard({
    itemCount: members?.data.length ?? 0,
    onOpen: handleKeyboardOpen,
    onClearSelection: handleKeyboardClear,
    searchInputRef,
    onCreate: canManage ? handleOpenAddDialog : undefined,
  });

  const pageState = usePageState({
    permission: "build:members:view",
    isLoading,
    isError,
    error,
  });

  return (
    <>
      <PageWrapper
        title="Access"
        subtitle="Manage project membership and roles"
        actions={
          canManage ? (
            <BuildHeaderActions
              actions={[
                {
                  id: "add-project-member",
                  label: "Add member",
                  icon: Plus,
                  primary: true,
                  onSelect: handleOpenAddDialog,
                },
              ]}
            />
          ) : undefined
        }
        filters={
          <BuildListToolbar
            search={{
              value: listFilters.search,
              onValueChange: listFilters.setSearch,
              placeholder: "Search members…",
              inputRef: searchInputRef,
            }}
            onClearAll={
              listFilters.activeCount > 0 ? listFilters.clearAll : undefined
            }
          />
        }
      >
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
            onRetry={handleRetry}
            className="flex-1"
          >
            <div className="flex flex-col gap-4">
              <PmSection index={0}>
                <PmPanel className="p-4" solid>
                  <div className="mb-3 border-b border-border pb-3">
                    <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
                      Member Roles
                    </h3>
                    <p
                      className={cn(
                        "mt-0.5 text-xs text-muted-foreground",
                        TEXT_BODY,
                      )}
                    >
                      Project-level roles for each member. Access is governed by
                      org-level permissions.
                    </p>
                  </div>
                  <ProjectMemberRolesSection
                    projectId={projectId}
                    search={listFilters.debouncedSearch}
                  />
                </PmPanel>
              </PmSection>

              <PmSection index={1}>
                <PmPanel className="p-4" solid>
                  <div className="mb-3 border-b border-border pb-3">
                    <h3 className={cn("text-sm font-medium", TEXT_ONE_LINE)}>
                      Teams &amp; Roster
                    </h3>
                    <p
                      className={cn(
                        "mt-0.5 text-xs text-muted-foreground",
                        TEXT_BODY,
                      )}
                    >
                      Teams this project belongs to and their effective members.
                    </p>
                  </div>
                  <TeamRosterSection
                    projectId={projectId}
                    search={listFilters.debouncedSearch}
                  />
                </PmPanel>
              </PmSection>
            </div>
          </PageState>
        </PmPageShell>
      </PageWrapper>

      <AddProjectMemberDialog
        projectId={projectId}
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </>
  );
}
