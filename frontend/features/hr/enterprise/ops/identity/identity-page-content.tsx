"use client";

import { useCallback, useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { PlusIcon } from "@animateicons/react/lucide";
import { useCan } from "@/hooks/api/access";
import {
  useAccessProvisioning,
  useProvisioningTemplates,
  useDeleteProvisioningTemplate,
  type AccessProvisioningRecord,
  type ProvisioningTemplate,
  type ProvisioningStatus,
  type ProvisioningTrigger,
} from "@/hooks/api/hr/enterprise-ops-identity";
import { ProvisioningSheet } from "./provisioning-sheet";
import { TemplateSheet } from "./template-sheet";
import { ExitVerificationView } from "./exit-verification-view";
import { format } from "date-fns";
import { useQueryClient } from "@tanstack/react-query";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import { PageState } from "@/components/shared/page-state";
import { DataTableSkeleton } from "@/components/ui/data-table-skeleton";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { usePageState } from "@/hooks/api/use-page-state";

const STATUS_COLORS: Record<ProvisioningStatus, string> = {
  pending: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  completed: "bg-status-info-surface text-status-info-ink border-status-info-rule",
  verified: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  failed: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
};

const TRIGGER_COLORS: Record<ProvisioningTrigger, string> = {
  joiner: "bg-status-success-surface text-status-success-ink",
  mover: "bg-status-info-surface text-status-info-ink",
  leaver: "bg-status-danger-surface text-status-danger-ink",
  manual: "bg-muted text-muted-foreground",
};

export function IdentityPageContent() {
  const canManage = useCan("hr:identity:manage");
  const [cursorHistory, setCursorHistory] = useState<Array<string | undefined>>([undefined]);
  const page = cursorHistory.length;
  const cursor = cursorHistory.at(-1);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState("provisioning");
  const [deletingTemplate, setDeletingTemplate] = useState<ProvisioningTemplate | null>(null);

  const qc = useQueryClient();

  const {
    data,
    isLoading,
    isFetching,
    isError: provisioningError,
    error: provisioningErrorData,
  } = useAccessProvisioning({ cursor });
  const {
    data: templates,
    isLoading: templatesLoading,
    isError: templatesError,
    error: templatesErrorData,
  } = useProvisioningTemplates();
  const deleteTemplate = useDeleteProvisioningTemplate();
  const { data: membersData } = useOrgMembers(1, 200);

  const provisioningState = usePageState({
    permission: "hr:identity:view",
    isLoading,
    isError: provisioningError,
    error: provisioningErrorData,
  });
  const templatesState = usePageState({
    permission: "hr:identity:view",
    isLoading: templatesLoading,
    isError: templatesError,
    error: templatesErrorData,
  });

  function handleRetry() {
    void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.hrIdentityAll });
  }

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = useCallback(
    (userId: string) => {
      const member = memberById.get(userId);
      return member ? getUserDisplayName(member) : userId;
    },
    [memberById],
  );

  const provisioningColumns: DataTableColumn<AccessProvisioningRecord>[] = useMemo(() => [
    {
      key: "userId",
      header: "Employee",
      cell: (r) => <span className="text-sm text-foreground">{resolveMemberName(r.userId)}</span>,
    },
    {
      key: "systemName",
      header: "System",
      cell: (r) => <span className="text-sm font-medium text-foreground">{r.systemName}</span>,
    },
    {
      key: "action",
      header: "Action",
      cell: (r) => (
        <Badge variant="outline" className="text-xs capitalize">
          {r.action}
        </Badge>
      ),
    },
    {
      key: "triggeredBy",
      header: "Trigger",
      cell: (r) => (
        <Badge variant="secondary" className={`text-xs capitalize ${TRIGGER_COLORS[r.triggeredBy]}`}>
          {r.triggeredBy}
        </Badge>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant="outline" className={`text-xs capitalize ${STATUS_COLORS[r.status]}`}>
          {r.status}
        </Badge>
      ),
    },
    {
      key: "requestedAt",
      header: "Requested",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">
          {format(new Date(r.requestedAt), "MMM d, yyyy")}
        </span>
      ),
    },
  ], [resolveMemberName]);

  const handleConfirmTemplateDelete = useCallback(() => {
    if (!deletingTemplate) return;
    deleteTemplate.mutate(deletingTemplate.id, {
      onSuccess: () => setDeletingTemplate(null),
    });
  }, [deleteTemplate, deletingTemplate]);

  const handleDeleteDialogChange = useCallback((open: boolean) => {
    if (!open) setDeletingTemplate(null);
  }, []);

  const handleAskDelete = useCallback(
    (template: ProvisioningTemplate) => () => setDeletingTemplate(template),
    [],
  );

  const handleOpenTemplate = useCallback(() => setShowTemplate(true), []);
  const handleOpenCreate = useCallback(() => setShowCreate(true), []);

  const templateColumns: DataTableColumn<ProvisioningTemplate>[] = [
    {
      key: "name",
      header: "Template",
      cell: (r) => <span className="text-sm font-medium text-foreground">{r.name}</span>,
    },
    {
      key: "triggeredBy",
      header: "Trigger",
      cell: (r) => (
        <Badge variant="secondary" className={`text-xs capitalize ${TRIGGER_COLORS[r.triggeredBy]}`}>
          {r.triggeredBy}
        </Badge>
      ),
    },
    {
      key: "systems",
      header: "Systems",
      cell: (r) => (
        <span className="text-sm text-muted-foreground">{r.systemsConfig.length} system(s)</span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (r) => canManage ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={handleAskDelete(r)}
        >
          Delete
        </Button>
      ) : null,
    },
  ];

  const handlePreviousPage = useCallback(() => {
    setCursorHistory((history) => history.length > 1 ? history.slice(0, -1) : history);
  }, []);

  const handleNextPage = useCallback(() => {
    const nextCursor = data?.pagination.nextCursor;
    if (nextCursor) setCursorHistory((history) => [...history, nextCursor]);
  }, [data?.pagination.nextCursor]);

  return (
    <>
      <PageWrapper
        title="Identity Lifecycle"
        subtitle="Manage system access provisioning for joiners, movers, and leavers"
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleOpenTemplate}>
                <PlusIcon size={16} className="mr-1.5" />
                New template
              </Button>
              <Button size="sm" onClick={handleOpenCreate}>
                <PlusIcon size={16} className="mr-1.5" />
                Provision
              </Button>
            </div>
          ) : null
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-1 min-h-0 flex-col">
          <TabsList className="mb-4 shrink-0">
            <TabsTrigger value="provisioning">Provisioning</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="exit">Exit Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="provisioning" className="mt-0 flex flex-1 min-h-0 flex-col">
            <PageState
              resolution={provisioningState}
              loading={<DataTableSkeleton columns={6} className="flex-1" />}
              onRetry={handleRetry}
              className="flex-1"
            >
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <DataTable
                  className="flex-1 min-h-0"
                  data={data?.data ?? []}
                  columns={provisioningColumns}
                  getRowKey={(r) => r.id}
                  emptyState={
                    <EmptyState
                      illustrationPreset="permissions"
                      title="No provisioning records"
                      description="Create a provisioning record to grant or revoke system access for joiners, movers, and leavers."
                      action={
                        canManage
                          ? { label: "Provision", onClick: handleOpenCreate }
                          : undefined
                      }
                      compact
                    />
                  }
                />
                {data && (page > 1 || data.pagination.hasMore) ? (
                  <CursorPageControls
                    page={page}
                    hasNext={data.pagination.hasMore}
                    disabled={isFetching}
                    onPrevious={handlePreviousPage}
                    onNext={handleNextPage}
                  />
                ) : null}
              </div>
            </PageState>
          </TabsContent>

          <TabsContent value="templates" className="mt-0 flex flex-1 min-h-0 flex-col">
            <PageState
              resolution={templatesState}
              loading={<DataTableSkeleton columns={4} rows={3} className="flex-1" />}
              onRetry={handleRetry}
              className="flex-1"
            >
              <DataTable
                className="flex-1 min-h-0"
                data={templates ?? []}
                columns={templateColumns}
                getRowKey={(r) => r.id}
                emptyState={
                  <EmptyState
                    illustrationPreset="automations"
                    title="No templates yet"
                    description="Create a template to auto-generate provisioning tasks for joiners, movers, or leavers."
                    action={
                      canManage
                        ? { label: "Create template", onClick: handleOpenTemplate }
                        : undefined
                    }
                    compact
                  />
                }
              />
            </PageState>
          </TabsContent>

          <TabsContent value="exit" className="mt-0 flex flex-1 min-h-0 flex-col">
            <ExitVerificationView />
          </TabsContent>
        </Tabs>
      </PageWrapper>

      <ProvisioningSheet open={showCreate} onOpenChange={setShowCreate} />
      <TemplateSheet open={showTemplate} onOpenChange={setShowTemplate} />
      <ConfirmDialog
        open={deletingTemplate !== null}
        onOpenChange={handleDeleteDialogChange}
        title="Delete provisioning template?"
        description={`"${deletingTemplate?.name ?? ""}" will no longer generate provisioning tasks. Existing records are kept.`}
        confirmLabel="Delete template"
        destructive
        isPending={deleteTemplate.isPending}
        keepOpenOnConfirm
        onConfirm={handleConfirmTemplateDelete}
      />
    </>
  );
}
