"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, UserPlus } from "lucide-react";
import { PlusIcon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useModuleMyPermissions } from "@/hooks/api/module-access";
import { RolesTab } from "@/features/module-access/components/roles-tab";
import { ModuleMembersTab } from "@/features/module-access/components/module-members-tab";
import { OwnershipSection } from "@/features/module-access/components/ownership-section";
import { AuditLogDrawer } from "@/features/module-access/components/audit-log-drawer";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

  const canManage =
    myPerms?.isOrgOwner === true ||
    myPerms?.isOrgAdmin === true ||
    myPerms?.isModuleAdmin === true;

  const canTransferOwnership =
    myPerms?.isOrgOwner === true || myPerms?.isModuleOwner === true;

  const [tab, setTab] = useState(focusUserId ? "members" : "roles");
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);

  const handleTabChange = useCallback((value: string) => setTab(value), []);
  const handleOpenAuditLog = useCallback(() => setAuditLogOpen(true), []);
  const handleAuditLogOpenChange = useCallback(
    (open: boolean) => setAuditLogOpen(open),
    [],
  );
  const handleOpenCreateGroup = useCallback(() => setCreateGroupOpen(true), []);
  const handleOpenAddMember = useCallback(() => setAddMemberOpen(true), []);

  return (
    <Tabs
      value={tab}
      onValueChange={handleTabChange}
      className="flex min-h-0 flex-1 flex-col gap-0"
    >
      <PageWrapper
        title={title}
        subtitle="Manage role groups, members, and permissions for this module."
        noInternalScroll
        contentClassName="flex min-h-0 flex-1 flex-col"
        actions={
          <Button variant="outline" size="sm" onClick={handleOpenAuditLog}>
            <ClipboardList className="mr-1.5 h-4 w-4" />
            Audit log
          </Button>
        }
        filtersClassName="justify-between"
        filters={
          <>
            <TabsList className="w-full shrink-0 md:w-auto">
              <TabsTrigger value="roles">Roles</TabsTrigger>
              <TabsTrigger value="members">Members</TabsTrigger>
              <TabsTrigger value="ownership">Ownership</TabsTrigger>
            </TabsList>

            <div className="ml-auto flex shrink-0 items-center gap-2">
              {tab === "roles" && canManage ? (
                <AnimatedIconButton
                  icon={PlusIcon}
                  iconSize={14}
                  iconClassName="mr-1.5"
                  size="sm"
                  className="h-8"
                  onClick={handleOpenCreateGroup}
                >
                  New group
                </AnimatedIconButton>
              ) : null}

              {tab === "members" && canManage ? (
                <Button size="sm" className="h-8 gap-1.5" onClick={handleOpenAddMember}>
                  <UserPlus className="h-3.5 w-3.5" />
                  Add member
                </Button>
              ) : null}
            </div>
          </>
        }
      >
        <div className="flex min-h-0 flex-1 flex-col">
          <TabsContent
            value="roles"
            className="mt-0 flex min-h-0 w-full flex-1 flex-col"
          >
            <RolesTab
              moduleKey={moduleKey}
              canManage={canManage}
              createOpen={createGroupOpen}
              onCreateOpenChange={setCreateGroupOpen}
              hideToolbar
            />
          </TabsContent>

          <TabsContent
            value="members"
            className="mt-0 flex min-h-0 w-full flex-1 flex-col"
          >
            <ModuleMembersTab
              moduleKey={moduleKey}
              canManage={canManage}
              focusUserId={focusUserId}
              addOpen={addMemberOpen}
              onAddOpenChange={setAddMemberOpen}
              hideToolbar
            />
          </TabsContent>

          <TabsContent value="ownership" className="mt-0">
            <OwnershipSection
              moduleKey={moduleKey}
              canManage={canTransferOwnership}
            />
          </TabsContent>
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
