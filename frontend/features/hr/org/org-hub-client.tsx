"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
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

export function OrgHubClient() {
  const canManage = useCan("hr:employees:manage");
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const initialTab = VALID_TABS.find((candidate) => candidate === requestedTab) ?? "roles";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

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

  return (
    <PageWrapper
      title="Job Architecture"
      subtitle="Manage the job roles and levels used by HR records"
      noInternalScroll
      contentClassName="flex flex-col gap-4 sm:gap-5"
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="roles" className="flex-1 gap-1.5 sm:flex-none">
            <Briefcase className="h-3 w-3" />
            Job Roles
          </TabsTrigger>
          <TabsTrigger value="levels" className="flex-1 gap-1.5 sm:flex-none">
            <Layers className="h-3 w-3" />
            Job Levels
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="roles"
          className="flex-1 min-h-0 mt-3 flex flex-col overflow-hidden"
        >
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
            <div className="flex min-h-full flex-1 flex-col overscroll-contain">
              <OrgCatalogTable<HrJobRole>
                title="Job Role"
                items={roles.data}
                isLoading={roles.isLoading}
                isError={roles.isError}
                onRetry={() => void roles.refetch()}
                canManage={canManage}
                onCreate={handleCreateJobRole}
                onUpdate={handleUpdateJobRole}
                onDelete={handleDeleteJobRole}
                isCreating={createRole.isPending}
                isUpdating={updateRole.isPending}
                illustrationPreset="person"
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="levels"
          className="flex-1 min-h-0 mt-3 flex flex-col overflow-hidden"
        >
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
            <div className="flex min-h-full flex-1 flex-col overscroll-contain">
              <OrgCatalogTable<HrJobLevel>
                title="Job Level"
                items={levels.data}
                isLoading={levels.isLoading}
                isError={levels.isError}
                onRetry={() => void levels.refetch()}
                canManage={canManage}
                onCreate={handleCreateJobLevel}
                onUpdate={handleUpdateJobLevel}
                onDelete={handleDeleteJobLevel}
                isCreating={createLevel.isPending}
                isUpdating={updateLevel.isPending}
                illustrationPreset="chart"
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
