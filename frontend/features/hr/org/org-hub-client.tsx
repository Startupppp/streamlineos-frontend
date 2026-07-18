"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useCan } from "@/hooks/api/access";
import { OrgCatalogTable } from "./org-catalog-table";
import { HeadcountStats } from "./headcount-stats";
import { DepartmentsTab } from "./departments-tab";
import {
  useOrgLocations,
  useCreateLocation,
  useUpdateLocation,
  useDeleteLocation,
  useOrgJobRoles,
  useCreateJobRole,
  useUpdateJobRole,
  useDeleteJobRole,
  useOrgJobLevels,
  useCreateJobLevel,
  useUpdateJobLevel,
  useDeleteJobLevel,
  useOrgTeams,
  useCreateTeam,
  useUpdateTeam,
  useDeleteTeam,
} from "@/hooks/api/hr/hr-org";
import { Building2, MapPin, Briefcase, Layers, Users } from "lucide-react";
import type { HrLocation, HrJobRole, HrJobLevel, HrTeam, OrgCatalogInput } from "@/types/hr/core";
import type { UseMutationResult } from "@tanstack/react-query";

type CatalogMutation<T> = UseMutationResult<T, Error, OrgCatalogInput>;
type CatalogUpdateMutation<T> = UseMutationResult<T, Error, OrgCatalogInput & { id: number }>;
type DeleteMutation<T> = UseMutationResult<T, Error, number>;

export function OrgHubClient() {
  const canManage = useCan("hr:employees:manage");

  const locations = useOrgLocations();
  const createLocation = useCreateLocation();
  const updateLocation = useUpdateLocation();
  const deleteLocation = useDeleteLocation();

  const roles = useOrgJobRoles();
  const createRole = useCreateJobRole();
  const updateRole = useUpdateJobRole();
  const deleteRole = useDeleteJobRole();

  const levels = useOrgJobLevels();
  const createLevel = useCreateJobLevel();
  const updateLevel = useUpdateJobLevel();
  const deleteLevel = useDeleteJobLevel();

  const teams = useOrgTeams();
  const createTeam = useCreateTeam();
  const updateTeam = useUpdateTeam();
  const deleteTeam = useDeleteTeam();

  return (
    <PageWrapper
      title="Organisation Structure"
      subtitle="Manage departments, teams, locations, and job catalog"
      variant="display"
      noInternalScroll
      contentClassName="flex flex-col gap-4 sm:gap-5"
    >
      <HeadcountStats groupBy="department" />
      <Tabs defaultValue="departments" className="flex flex-col flex-1 min-h-0">
        <TabsList className="shrink-0">
          <TabsTrigger value="departments" className="gap-1.5">
            <Building2 className="h-3 w-3" />
            Departments
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-1.5">
            <Users className="h-3 w-3" />
            Teams
          </TabsTrigger>
          <TabsTrigger value="locations" className="gap-1.5">
            <MapPin className="h-3 w-3" />
            Locations
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-1.5">
            <Briefcase className="h-3 w-3" />
            Job Roles
          </TabsTrigger>
          <TabsTrigger value="levels" className="gap-1.5">
            <Layers className="h-3 w-3" />
            Job Levels
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="departments"
          className="flex-1 min-h-0 mt-3 flex flex-col overflow-hidden"
        >
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
            <div className="flex min-h-full flex-1 flex-col overscroll-contain">
              <DepartmentsTab canManage={canManage} />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="teams"
          className="flex-1 min-h-0 mt-3 flex flex-col overflow-hidden"
        >
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
            <div className="flex min-h-full flex-1 flex-col overscroll-contain">
              <OrgCatalogTable<HrTeam>
                title="Team"
                items={teams.data}
                isLoading={teams.isLoading}
                canManage={canManage}
                onCreate={createTeam as CatalogMutation<HrTeam>}
                onUpdate={updateTeam as CatalogUpdateMutation<HrTeam>}
                onDelete={deleteTeam as DeleteMutation<{ success: boolean }>}
                illustrationPreset="team"
              />
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent
          value="locations"
          className="flex-1 min-h-0 mt-3 flex flex-col overflow-hidden"
        >
          <ScrollArea fill hideScrollbar className="min-h-0 flex-1">
            <div className="flex min-h-full flex-1 flex-col overscroll-contain">
              <OrgCatalogTable<HrLocation>
                title="Location"
                items={locations.data}
                isLoading={locations.isLoading}
                canManage={canManage}
                onCreate={createLocation as CatalogMutation<HrLocation>}
                onUpdate={updateLocation as CatalogUpdateMutation<HrLocation>}
                onDelete={deleteLocation as DeleteMutation<{ success: boolean }>}
                illustrationPreset="travel"
                extraColumns={[
                  {
                    label: "Type",
                    render: (item) =>
                      item.type ? (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-muted border border-border">
                          {item.type}
                        </span>
                      ) : null,
                  },
                ]}
              />
            </div>
          </ScrollArea>
        </TabsContent>

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
                canManage={canManage}
                onCreate={createRole as CatalogMutation<HrJobRole>}
                onUpdate={updateRole as CatalogUpdateMutation<HrJobRole>}
                onDelete={deleteRole as DeleteMutation<{ success: boolean }>}
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
                canManage={canManage}
                onCreate={createLevel as CatalogMutation<HrJobLevel>}
                onUpdate={updateLevel as CatalogUpdateMutation<HrJobLevel>}
                onDelete={deleteLevel as DeleteMutation<{ success: boolean }>}
                illustrationPreset="chart"
              />
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </PageWrapper>
  );
}
