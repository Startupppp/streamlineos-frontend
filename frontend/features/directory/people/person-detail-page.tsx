"use client";

import { useCallback, useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { useCan } from "@/hooks/api/access";
import { usePerson } from "@/hooks/api/directory/people";
import { cn } from "@/lib/utils";
import { getPersonAccessBadge } from "./person-account-access";
import { getPersonDisplayName } from "./person-detail-formatters";
import { PersonMembershipTab } from "./person-membership-tab";
import { PersonModulesTab } from "./person-modules-tab";
import {
  PersonDetailSkeleton,
  PersonProfileTab,
} from "./person-profile-tab";
import { PersonWorkerTab } from "./person-worker-tab";
import { PersonFormDialog } from "./person-form-dialog";

interface PersonDetailPageProps {
  organizationPersonId: string;
  directoryBasePath?: string;
}

export function PersonDetailPage({
  organizationPersonId,
  directoryBasePath = "/directory",
}: PersonDetailPageProps) {
  const canUpdatePerson = useCan("directory:people:update");
  const canViewMembers = useCan("settings:view");
  const canViewWorkers = useCan("directory:workers:view");
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const {
    data: person,
    isLoading,
    isError,
    refetch,
  } = usePerson(organizationPersonId);

  const tabs = useMemo(() => {
    const availableTabs = [{ value: "profile", label: "Profile" }];
    if (canViewMembers)
      availableTabs.push({ value: "membership", label: "Membership" });
    if (canViewWorkers)
      availableTabs.push({ value: "worker", label: "Worker" });
    if (canViewMembers)
      availableTabs.push({ value: "modules", label: "Modules" });
    return availableTabs;
  }, [canViewMembers, canViewWorkers]);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleOpenEdit = useCallback(() => {
    setEditDialogOpen(true);
  }, []);

  const handleEditDialogOpenChange = useCallback((nextOpen: boolean) => {
    setEditDialogOpen(nextOpen);
  }, []);

  const title = person ? getPersonDisplayName(person) : "Person";

  return (
    <PageWrapper
      title={title}
      subtitle={person?.workEmail ?? "Person record"}
      badge={person ? getPersonAccessBadge(person) : undefined}
      backHref={directoryBasePath}
      noInternalScroll
      actions={
        canUpdatePerson && person ? (
          <Button onClick={handleOpenEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit profile
          </Button>
        ) : undefined
      }
    >
      {isLoading ? (
        <PersonDetailSkeleton />
      ) : isError ? (
        <ErrorState onRetry={handleRetry} />
      ) : !person ? (
        <EmptyState
          illustrationPreset="team"
          title="Person not found"
          description="This record may have been deleted or you may not have access."
          className="flex-1"
        />
      ) : (
        <Tabs
          defaultValue="profile"
          className="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden rounded-lg border border-border bg-card"
        >
          <div className="shrink-0 overflow-x-auto border-b border-border bg-muted/20 p-2">
            <TabsList className="w-max min-w-full justify-start border-0 bg-transparent p-0 shadow-none sm:min-w-0">
              {tabs.map((personTab) => (
                <TabsTrigger
                  key={personTab.value}
                  value={personTab.value}
                  className="min-w-fit"
                >
                  {personTab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent
            value="profile"
            className={cn(
              TABS_CONTENT_PAGE_BODY_CLASS,
              "overflow-y-auto p-4 sm:p-5",
            )}
          >
            <PersonProfileTab person={person} />
          </TabsContent>

          {canViewMembers ? (
            <TabsContent
              value="membership"
              id="membership"
              className={cn(
                TABS_CONTENT_PAGE_BODY_CLASS,
                "overflow-y-auto p-4 sm:p-5",
              )}
            >
              <PersonMembershipTab person={person} onRefresh={handleRetry} />
            </TabsContent>
          ) : null}

          {canViewWorkers ? (
            <TabsContent
              value="worker"
              className={cn(
                TABS_CONTENT_PAGE_BODY_CLASS,
                "overflow-y-auto p-4 sm:p-5",
              )}
            >
              <PersonWorkerTab person={person} />
            </TabsContent>
          ) : null}

          {canViewMembers ? (
            <TabsContent
              value="modules"
              className={cn(
                TABS_CONTENT_PAGE_BODY_CLASS,
                "overflow-y-auto p-4 sm:p-5",
              )}
            >
              <PersonModulesTab person={person} onRefresh={handleRetry} />
            </TabsContent>
          ) : null}
        </Tabs>
      )}

      {editDialogOpen && person ? (
        <PersonFormDialog
          open={editDialogOpen}
          onOpenChange={handleEditDialogOpenChange}
          mode="edit"
          defaultValues={person}
        />
      ) : null}
    </PageWrapper>
  );
}
