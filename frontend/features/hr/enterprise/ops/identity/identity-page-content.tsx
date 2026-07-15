"use client";

import { useMemo, useState } from "react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, RefreshCw, AlertTriangle } from "lucide-react";
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
import { useOrgMembers } from "@/hooks/api/organization";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/features/projects/shared/resolve-user-name";

const STATUS_COLORS: Record<ProvisioningStatus, string> = {
  pending: "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-300 dark:border-yellow-500/30",
  completed: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-300 dark:border-blue-500/30",
  verified: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30",
  failed: "bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
};

const TRIGGER_COLORS: Record<ProvisioningTrigger, string> = {
  joiner: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  mover: "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300",
  leaver: "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-300",
  manual: "bg-muted text-muted-foreground",
};

export function IdentityPageContent() {
  const canManage = useCan("hr:identity:manage");
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [showTemplate, setShowTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState("provisioning");

  const qc = useQueryClient();

  const { data, isLoading, isError: provisioningError } = useAccessProvisioning({ page });
  const { data: templates, isLoading: templatesLoading, isError: templatesError } = useProvisioningTemplates();
  const deleteTemplate = useDeleteProvisioningTemplate();
  const { data: membersData } = useOrgMembers(1, 200);

  const pageError = provisioningError || templatesError;

  function handleRetry() {
    void qc.invalidateQueries({ queryKey: ["hr-identity"] });
  }

  const memberById = useMemo(() => {
    const map = new Map<string, NamedUser>();
    for (const member of membersData?.data ?? []) {
      map.set(member.userId, { name: member.name, email: member.email });
    }
    return map;
  }, [membersData]);

  const resolveMemberName = (userId: string) => {
    const member = memberById.get(userId);
    return member ? getUserDisplayName(member) : userId;
  };

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
  ], [memberById]);

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
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10"
          onClick={(e) => { e.stopPropagation(); deleteTemplate.mutate(r.id); }}
        >
          Delete
        </Button>
      ) : null,
    },
  ];

  if (pageError) {
    return (
      <PageWrapper
        title="Identity Lifecycle"
        subtitle="Manage system access provisioning for joiners, movers, and leavers"
      >
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="bg-destructive/10 p-4 rounded-full">
            <AlertTriangle className="h-8 w-8 text-destructive" aria-hidden="true" />
          </div>
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
                <Plus className="h-4 w-4 mr-1.5" />
                Template
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="h-4 w-4 mr-1.5" />
                Provision
              </Button>
            </div>
          ) : null
        }
      >
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="provisioning">Provisioning</TabsTrigger>
            <TabsTrigger value="templates">Templates</TabsTrigger>
            <TabsTrigger value="exit">Exit Verification</TabsTrigger>
          </TabsList>

          <TabsContent value="provisioning">
            {isLoading ? (
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <DataTable
                data={data?.data ?? []}
                columns={provisioningColumns}
                getRowKey={(r) => r.id}
                isLoading={false}
                emptyState={<p className="text-sm text-muted-foreground text-center py-8">No provisioning records</p>}
                pagination={
                  data
                    ? {
                        mode: "server",
                        page,
                        pageSize: data.pagination.limit,
                        total: data.pagination.total,
                        onPageChange: setPage,
                      }
                    : undefined
                }
              />
            )}
          </TabsContent>

          <TabsContent value="templates">
            {templatesLoading ? (
              <div className="space-y-2 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-lg bg-muted" />
                ))}
              </div>
            ) : (
              <DataTable
                data={templates ?? []}
                columns={templateColumns}
                getRowKey={(r) => r.id}
                isLoading={false}
                emptyState={<p className="text-sm text-muted-foreground text-center py-8">No templates. Create one to auto-generate provisioning tasks.</p>}
              />
            )}
          </TabsContent>

          <TabsContent value="exit">
            <ExitVerificationView />
          </TabsContent>
        </Tabs>
      </PageWrapper>

      <ProvisioningSheet open={showCreate} onOpenChange={setShowCreate} />
      <TemplateSheet open={showTemplate} onOpenChange={setShowTemplate} />
    </>
  );
}
