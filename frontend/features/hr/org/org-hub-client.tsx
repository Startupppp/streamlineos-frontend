"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { OrgCatalogTable } from "./org-catalog-table";
import {
  useOrgJobRoles,
  useCreateJobRole,
  useUpdateJobRole,
  useDeleteJobRole,
  useOrgJobLevels,
  useCreateJobLevel,
  useUpdateJobLevel,
  useDeleteJobLevel,
} from "@/hooks/api/hr/hr-org";
import { Briefcase, Layers } from "lucide-react";
import type { HrJobRole, HrJobLevel, OrgCatalogInput } from "@/types/hr/core";

const VALID_TABS = ["roles", "levels"] as const;
const DEFAULT_TAB = "roles";

export function OrgHubClient() {
  const canManage = useCan("hr:employees:manage");
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab =
    VALID_TABS.find((candidate) => candidate === requestedTab) ?? DEFAULT_TAB;

  /**
   * Ticket 05. Position Control keeps its tab in the URL, so back, forward and
   * a shared link all land on the tab that was open (FE-86). This used to seed
   * `useState` from the query string once and then diverge from it.
   */
  const handleTabChange = useCallback(
    (tab: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === DEFAULT_TAB) params.delete("tab");
      else params.set("tab", tab);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const roles = useOrgJobRoles({ enabled: activeTab === "roles" });
  const createRole = useCreateJobRole();
  const updateRole = useUpdateJobRole();
  const deleteRole = useDeleteJobRole();

  const levels = useOrgJobLevels({ enabled: activeTab === "levels" });
  const createLevel = useCreateJobLevel();
  const updateLevel = useUpdateJobLevel();
  const deleteLevel = useDeleteJobLevel();

  function handleCreateJobRole(jobRole: OrgCatalogInput) {
    return createRole.mutateAsync(jobRole);
  }

  function handleUpdateJobRole(jobRoleId: number, jobRole: OrgCatalogInput) {
    return updateRole.mutateAsync({ jobRoleId, ...jobRole });
  }

  function handleDeleteJobRole(jobRoleId: number) {
    return deleteRole.mutateAsync(jobRoleId);
  }

  function handleCreateJobLevel(jobLevel: OrgCatalogInput) {
    return createLevel.mutateAsync(jobLevel);
  }

  function handleUpdateJobLevel(jobLevelId: number, jobLevel: OrgCatalogInput) {
    return updateLevel.mutateAsync({ jobLevelId, ...jobLevel });
  }

  function handleDeleteJobLevel(jobLevelId: number) {
    return deleteLevel.mutateAsync(jobLevelId);
  }

  function handleRetryRoles() {
    void roles.refetch();
  }

  function handleRetryLevels() {
    void levels.refetch();
  }

  return (
    <Tabs
      value={activeTab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col"
    >
      <TabsList className="shrink-0">
        <TabsTrigger value="roles" className="gap-1.5">
          <Briefcase className="h-3.5 w-3.5" />
          Job Roles
        </TabsTrigger>
        <TabsTrigger value="levels" className="gap-1.5">
          <Layers className="h-3.5 w-3.5" />
          Job Levels
        </TabsTrigger>
      </TabsList>

      <TabsContent value="roles" className="mt-0 flex min-h-0 flex-1 flex-col">
        <OrgCatalogTable<HrJobRole>
          title="Job Role"
          items={roles.data}
          isLoading={roles.isLoading}
          isError={roles.isError}
          error={roles.error}
          onRetry={handleRetryRoles}
          canManage={canManage}
          onCreate={handleCreateJobRole}
          onUpdate={handleUpdateJobRole}
          onDelete={handleDeleteJobRole}
          isCreating={createRole.isPending}
          isUpdating={updateRole.isPending}
          illustrationPreset="person"
        />
      </TabsContent>

      <TabsContent value="levels" className="mt-0 flex min-h-0 flex-1 flex-col">
        <OrgCatalogTable<HrJobLevel>
          title="Job Level"
          items={levels.data}
          isLoading={levels.isLoading}
          isError={levels.isError}
          error={levels.error}
          onRetry={handleRetryLevels}
          canManage={canManage}
          onCreate={handleCreateJobLevel}
          onUpdate={handleUpdateJobLevel}
          onDelete={handleDeleteJobLevel}
          isCreating={createLevel.isPending}
          isUpdating={updateLevel.isPending}
          illustrationPreset="chart"
        />
      </TabsContent>
    </Tabs>
  );
}
