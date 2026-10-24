"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ClipboardList, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";
import { getErrorMessage } from "@/lib/get-error-message";
import { useModuleMyPermissions } from "@/hooks/api/module-access";
import { manageKey, viewKey } from "@/hooks/api/module-access/types";
import { useCan } from "@/hooks/api/access";
import { RolesTab } from "@/features/module-access/components/roles-tab";
import { ModuleMembersTab } from "@/features/module-access/components/module-members-tab";
import { OwnershipSection } from "@/features/module-access/components/ownership-section";
import { AuditLogDrawer } from "@/features/module-access/components/audit-log-drawer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const TAB_PANEL_CLASS = `${TABS_CONTENT_PAGE_BODY_CLASS} mt-0 h-full min-h-0 w-full flex-1`;

interface ModuleAccessPageProps {
  moduleKey: string;
  title: string;
}

export function ModuleAccessPage({ moduleKey, title }: ModuleAccessPageProps) {
  const searchParams = useSearchParams();
  const rawUserId = searchParams.get("userId");
  const focusUserId =
    rawUserId !== null && UUID_RE.test(rawUserId) ? rawUserId : undefined;

  const myPermissionsQuery = useModuleMyPermissions(moduleKey);
  const myPerms = myPermissionsQuery.data;
  const isModuleOwner = myPerms?.isModuleOwner === true;

  const canManage =
    myPerms?.isOrgOwner === true ||
    myPerms?.isOrgAdmin === true ||
    isModuleOwner ||
    myPerms?.isModuleAdmin === true;
  const canView =
    canManage ||
    (myPerms?.permissions ?? []).some(
      (permission) =>
        (permission.key === viewKey(moduleKey) || permission.key === manageKey(moduleKey)) &&
        permission.scope !== "none",
    );
  const viewOnly = !canManage && canView;
  const canInvite = useCan("settings:organization:manage");

  const [tab, setTab] = useState(focusUserId ? "members" : "roles");
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  const handleTabChange = useCallback((value: string) => setTab(value), []);
  const handleOpenAuditLog = useCallback(() => setAuditLogOpen(true), []);
  const handleAuditLogOpenChange = useCallback(
    (open: boolean) => setAuditLogOpen(open),
    [],
  );
  const handleOpenAddMember = useCallback(() => setAddMemberOpen(true), []);
  const { refetch: refetchMyPermissions } = myPermissionsQuery;
  const handleRetryPermissions = useCallback(() => {
    void refetchMyPermissions();
  }, [refetchMyPermissions]);
  const canViewOwnership = isModuleOwner;
  const visibleTab = viewOnly
    ? "members"
    : tab === "ownership" && !canViewOwnership
      ? "roles"
      : tab;

  return (
    <Tabs
      value={visibleTab}
      onValueChange={handleTabChange}
      className="flex h-full min-h-0 flex-1 flex-col gap-0"
    >
      <PageWrapper
        title={title}
        subtitle={
          viewOnly
            ? "See who can use this module. Module admins and owners can change it."
            : "Manage role groups, members, and permissions for this module."
        }
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
        actions={
          canManage ? (
            <Button variant="outline" size="sm" onClick={handleOpenAuditLog}>
              <ClipboardList className="mr-1.5 h-4 w-4" />
              Audit log
            </Button>
          ) : undefined
        }
        filtersClassName="justify-between"
        filters={
          <>
            <TabsList className="w-full shrink-0 md:w-auto">
              {viewOnly ? null : <TabsTrigger value="roles">Roles</TabsTrigger>}
              <TabsTrigger value="members">Members</TabsTrigger>
              {canViewOwnership ? (
                <TabsTrigger value="ownership">Ownership</TabsTrigger>
              ) : null}
            </TabsList>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {visibleTab === "members" && canManage && canInvite ? (
                <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
                  <Link href="/settings/users?create=1">
                    <Mail className="h-3.5 w-3.5" />
                    Invite to organisation
                  </Link>
                </Button>
              ) : null}
              {visibleTab === "members" && canManage ? (
                <Button size="sm" className="h-8 gap-1.5" onClick={handleOpenAddMember}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Add member
                </Button>
              ) : null}
            </div>
          </>
        }
      >
        <div className="flex h-full min-h-0 flex-1 flex-col">
          {myPermissionsQuery.isError ? (
            <ErrorState
              description={getErrorMessage(myPermissionsQuery.error)}
              onRetry={handleRetryPermissions}
            />
          ) : !myPermissionsQuery.isLoading && !canView ? (
            <NoPermissionState
              title="Admin access required"
              description="You need module admin or owner standing to manage access for this module."
            />
          ) : (
            <>
              {viewOnly ? null : (
                <TabsContent value="roles" className={TAB_PANEL_CLASS}>
                  <RolesTab moduleKey={moduleKey} canManage={canManage} />
                </TabsContent>
              )}

              <TabsContent value="members" className={TAB_PANEL_CLASS}>
                <ModuleMembersTab
                  moduleKey={moduleKey}
                  canManage={canManage}
                  focusUserId={focusUserId}
                  addOpen={addMemberOpen}
                  onAddOpenChange={setAddMemberOpen}
                  hideToolbar
                />
              </TabsContent>

              {canViewOwnership ? (
                <TabsContent value="ownership" className={TAB_PANEL_CLASS}>
                  <OwnershipSection moduleKey={moduleKey} canManage={canViewOwnership} />
                </TabsContent>
              ) : null}
            </>
          )}
        </div>
      </PageWrapper>

      <AuditLogDrawer
        moduleKey={moduleKey}
        open={auditLogOpen}
        onOpenChange={handleAuditLogOpenChange}
      />
    </Tabs>
  );
}
