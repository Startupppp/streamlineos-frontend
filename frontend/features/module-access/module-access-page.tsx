"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const defaultTab = focusUserId ? "members" : "roles";

  const myPermissionsQuery = useModuleMyPermissions(moduleKey);
  const myPerms = myPermissionsQuery.data;

  const canManage =
    myPerms?.isOrgOwner === true ||
    myPerms?.isOrgAdmin === true ||
    myPerms?.isModuleAdmin === true;

  const canTransferOwnership =
    myPerms?.isOrgOwner === true || myPerms?.isModuleOwner === true;

  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const handleOpenAuditLog = useCallback(() => setAuditLogOpen(true), []);
  const handleAuditLogOpenChange = useCallback(
    (open: boolean) => setAuditLogOpen(open),
    [],
  );

  return (
    <PageWrapper
      title={title}
      subtitle="Manage role groups, members, and permissions for this module."
      noInternalScroll
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenAuditLog}
        >
          <ClipboardList className="h-4 w-4 mr-1.5" />
          Audit log
        </Button>
      }
    >
      <Tabs defaultValue={defaultTab} className="flex flex-col flex-1 min-h-0 gap-0">
        <TabsList className="mb-4 self-start">
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="ownership">Ownership</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="flex flex-col flex-1 min-h-0 mt-0">
          <RolesTab moduleKey={moduleKey} canManage={canManage} />
        </TabsContent>

        <TabsContent value="members" className="flex flex-col flex-1 min-h-0 mt-0">
          <ModuleMembersTab
            moduleKey={moduleKey}
            canManage={canManage}
            focusUserId={focusUserId}
          />
        </TabsContent>

        <TabsContent value="ownership" className="mt-0">
          <OwnershipSection moduleKey={moduleKey} canManage={canTransferOwnership} />
        </TabsContent>
      </Tabs>

      <AuditLogDrawer
        moduleKey={moduleKey}
        open={auditLogOpen}
        onOpenChange={handleAuditLogOpenChange}
      />
    </PageWrapper>
  );
}
