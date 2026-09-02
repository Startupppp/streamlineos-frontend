"use client";

import { useCallback, useMemo, useState, type MouseEvent } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CursorPageControls } from "@/components/ui/cursor-page-controls";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { RefreshCw } from "lucide-react";
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
import { queryKeys } from "@/lib/query-keys";
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";
import { StateIllustration } from "@/components/illustrations";

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

  const qc = useQueryClient();

  const {
    data,
    isLoading,
    isFetching,
    isError: provisioningError,
  } = useAccessProvisioning({ cursor });
  const { data: templates, isLoading: templatesLoading, isError: templatesError } = useProvisioningTemplates();
  const deleteTemplate = useDeleteProvisioningTemplate();
  const { data: membersData } = useOrgMembers(1, 200);

  const pageError = provisioningError || templatesError;

  function handleRetry() {
    void qc.invalidateQueries({ queryKey: queryKeys.hr.hrIdentityAll });
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

  const handleTemplateDelete = useCallback(
    (templateId: string) => (event: MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      deleteTemplate.mutate(templateId);
    },
    [deleteTemplate],
  );

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
          onClick={handleTemplateDelete(r.id)}
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

  if (pageError) {
    return (
      <PageWrapper
        title="Identity Lifecycle"
        subtitle="Manage system access provisioning for joiners, movers, and leavers"
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-16 gap-4 text-center">
          <StateIllustration preset="alert" className="h-28 w-28" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-foreground">Failed to load identity data</p>
            <p className="text-sm text-muted-foreground max-w-sm">
              There was a problem fetching provisioning records. Please try again.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <>
      <PageWrapper
        title="Identity Lifecycle"
        subtitle="Manage system access provisioning for joiners, movers, and leavers"
        actions={
          canManage ? (
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowTemplate(true)}>
                <PlusIcon size={16} className="mr-1.5" />
                Template
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
            {isLoading ? (
              <div className="flex flex-1 min-h-0 flex-col gap-2 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col gap-3">
                <DataTable
                  className="flex-1 min-h-0"
                  data={data?.data ?? []}
                  columns={provisioningColumns}
                  getRowKey={(r) => r.id}
                  isLoading={false}
                  emptyState={
                    <EmptyState
                      illustrationPreset="permissions"
                      title="No provisioning records"
                      description="Create a provisioning record to grant or revoke system access for joiners, movers, and leavers."
                      action={
                        canManage
                          ? { label: "Provision", onClick: () => setShowCreate(true) }
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
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-0 flex flex-1 min-h-0 flex-col">
            {templatesLoading ? (
              <div className="flex flex-1 min-h-0 flex-col gap-2 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <DataTable
                className="flex-1 min-h-0"
                data={templates ?? []}
                columns={templateColumns}
                getRowKey={(r) => r.id}
                isLoading={false}
                emptyState={
                  <EmptyState
                    illustrationPreset="automations"
                    title="No templates yet"
                    description="Create a template to auto-generate provisioning tasks for joiners, movers, or leavers."
                    action={
                      canManage
                        ? { label: "Create template", onClick: () => setShowTemplate(true) }
                        : undefined
                    }
                    compact
                  />
                }
              />
            )}
          </TabsContent>

          <TabsContent value="exit" className="mt-0 flex flex-1 min-h-0 flex-col">
            <ExitVerificationView />
          </TabsContent>
        </Tabs>
      </PageWrapper>

      <ProvisioningSheet open={showCreate} onOpenChange={setShowCreate} />
      <TemplateSheet open={showTemplate} onOpenChange={setShowTemplate} />
    </>
  );
}
