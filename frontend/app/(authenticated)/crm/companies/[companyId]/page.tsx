"use client";

import { useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Users,
  Link2,
  TrendingUp,
  BarChart2,
  UserCircle,
  GitBranch,
  Pencil,
  Trash2,
  Inbox,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  useCrmOrganizationDetail,
  useCrmOrgHierarchy,
  useCrmOrgRollup,
  useCrmOrgTimeline,
  useCrmOrgRelatedLeads,
  useDeleteCrmOrganization,
  useCompany360,
} from "@/hooks/api/crm";
import { useCrmOptions, resolveOption } from "@/hooks/api/crm/metadata";
import { AccountHealthBadge, computeHealthScore } from "@/features/crm/companies/detail/account-health-badge";
import { HierarchyTree } from "@/features/crm/companies/detail/hierarchy-tree";
import { AccountTimeline } from "@/features/crm/companies/detail/account-timeline";
import { AccountNotes } from "@/features/crm/companies/detail/account-notes";
import { LinkParentDialog } from "@/features/crm/companies/detail/link-parent-dialog";
import { Customer360Section } from "@/features/crm/shared/customer-360-section";
import { Customer360Timeline } from "@/features/crm/shared/customer-360-timeline";
import { CrmOptionBadge } from "@/features/crm/shared/metadata";
import { formatCurrency } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { RelatedLead } from "@/types/crm";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-border/50 last:border-0">
      <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        <span className="text-xs text-muted-foreground shrink-0">{label}</span>
        <span className="text-xs text-foreground text-right min-w-0 truncate">{value}</span>
      </div>
    </div>
  );
}

function DetailPageSkeleton() {
  return (
    <PageWrapper title="Company" subtitle="Loading..." backHref="/crm/companies">
      <div className="space-y-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total Deal Value" value="" icon={DollarSign} tone="emerald" isLoading />
          <StatCard label="Active Deals" value="" icon={TrendingUp} tone="blue" isLoading />
          <StatCard label="Open Leads" value="" icon={Inbox} tone="amber" isLoading />
          <StatCard label="Total Contacts" value="" icon={Users} tone="blue" isLoading />
        </StatCardGrid>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="px-4 py-3 space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-4 w-full" />)}
              </CardContent>
            </Card>
          </div>
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="px-4 py-3 space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}

export default function CompanyDetailPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const { companyId } = use(params);
  const id = Number(companyId);
  const router = useRouter();

  const [linkParentOpen, setLinkParentOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: org, isLoading: orgLoading, isError: orgError, error: orgDetailError, refetch: refetchOrg } = useCrmOrganizationDetail(id);
  const { data: rollup } = useCrmOrgRollup(id);
  const { data: hierarchy } = useCrmOrgHierarchy(id);
  const { data: timeline } = useCrmOrgTimeline(id);
  const { data: relatedLeads } = useCrmOrgRelatedLeads(id);
  const { data: company360, isLoading: company360Loading } = useCompany360(id);
  const { data: leadStatusOptions = [] } = useCrmOptions("lead_status");
  const { data: priorityOptions = [] } = useCrmOptions("priority");
  const deleteMutation = useDeleteCrmOrganization();

  const relatedLeadsColumns: DataTableColumn<RelatedLead>[] = [
    {
      key: "name",
      header: "Name",
      cell: (lead) => (
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center text-[9px] font-semibold text-primary shrink-0">
            {(lead.name ?? "?")[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            {lead.name
              ? <TruncatedText text={lead.name} className="font-medium" />
              : <span className="font-medium">—</span>}
            {lead.email && (
              <TruncatedText text={lead.email} className="text-micro text-muted-foreground" />
            )}
          </div>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (lead) => (
        <CrmOptionBadge option={resolveOption(leadStatusOptions, lead.status)} />
      ),
    },
    {
      key: "priority",
      header: "Priority",
      cell: (lead) => (
        <CrmOptionBadge option={resolveOption(priorityOptions, lead.priority)} />
      ),
    },
    {
      key: "source",
      header: "Source",
      cell: (lead) => (
        <span className="capitalize text-muted-foreground">
          {lead.source?.toLowerCase().replace(/_/g, " ") ?? "—"}
        </span>
      ),
    },
  ];

  const handleOpenLinkParent = useCallback(() => setLinkParentOpen(true), []);
  const handleLinkParentOpenChange = useCallback((open: boolean) => setLinkParentOpen(open), []);
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);
  const handleDeleteOpenChange = useCallback((open: boolean) => setDeleteOpen(open), []);

  const handleConfirmDelete = useCallback(() => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast.success("Company deleted");
        router.push("/crm/companies");
      },
      onError: (e) => toast.error(getErrorMessage(e)),
    });
  }, [id, deleteMutation, router]);

  const handleRefetchOrg = useCallback(() => { void refetchOrg(); }, [refetchOrg]);

  if (orgLoading) return <DetailPageSkeleton />;

  if (orgError) {
    return (
      <PageWrapper title="Company" subtitle="" backHref="/crm/companies">
        <ErrorState
          description={getErrorMessage(orgDetailError)}
          onRetry={handleRefetchOrg}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  if (!org) {
    return (
      <PageWrapper title="Not Found" subtitle="" backHref="/crm/companies">
        <EmptyState
          title="Company not found"
          description="This company may have been deleted or you don't have access."
          action={{ label: "Back to Companies", href: "/crm/companies" }}
          className="flex-1"
        />
      </PageWrapper>
    );
  }

  const displayScore = org.healthScore ?? (rollup ? computeHealthScore(rollup) : null);

  return (
    <PageWrapper
      title={org.name}
      subtitle={org.description ?? org.industry ?? undefined}
      backHref="/crm/companies"
      actions={
        <>
          <AccountHealthBadge healthScore={displayScore} />
          <Button variant="outline" onClick={handleOpenLinkParent}>
            <GitBranch className="h-3.5 w-3.5" />
            {org.parentId ? "Change Parent" : "Link Parent"}
          </Button>
          <Button variant="default" asChild>
            <Link href={`/crm/companies/${id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleOpenDelete}
            aria-label="Delete company"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <StatCardGrid cols={4}>
          <StatCard
            label="Total Deal Value"
            value={rollup ? formatCurrency(rollup.totalDealValue) : "—"}
            icon={DollarSign}
            color="green"
          />
          <StatCard
            label="Active Deals"
            value={rollup?.openDeals ?? "—"}
            icon={TrendingUp}
            color="blue"
          />
          <StatCard
            label="Open Leads"
            value={rollup?.totalLeads ?? "—"}
            icon={Inbox}
            color="amber"
          />
          <StatCard
            label="Total Contacts"
            value={rollup?.totalContacts ?? "—"}
            icon={Users}
            color="blue"
          />
        </StatCardGrid>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Company Info
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3">
                {org.industry && (
                  <InfoRow icon={BarChart2} label="Industry" value={org.industry} />
                )}
                {org.size && (
                  <InfoRow icon={Users} label="Company Size" value={`${org.size} employees`} />
                )}
                {org.domain && (
                  <InfoRow icon={Globe} label="Domain" value={org.domain} />
                )}
                {org.website && (
                  <InfoRow
                    icon={Link2}
                    label="Website"
                    value={
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 hover:underline break-all">
                        {org.website}
                      </a>
                    }
                  />
                )}
                {org.linkedinUrl && (
                  <InfoRow
                    icon={UserCircle}
                    label="LinkedIn"
                    value={
                      <a href={org.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 hover:underline">
                        View profile
                      </a>
                    }
                  />
                )}
                {org.parentId && (
                  <InfoRow
                    icon={GitBranch}
                    label="Parent Account"
                    value={
                      <Link href={`/crm/companies/${org.parentId}`} className="text-primary hover:text-primary/80 hover:underline">
                        View parent
                      </Link>
                    }
                  />
                )}
                {!org.industry && !org.size && !org.domain && !org.website && !org.linkedinUrl && !org.parentId && (
                  <p className="text-xs text-muted-foreground py-2">No details recorded.</p>
                )}
              </CardContent>
            </Card>

            {hierarchy && (
              <Card className="shadow-sm">
                <CardHeader className="px-4 py-3 border-b">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    Company Hierarchy
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 py-3">
                  <HierarchyTree root={hierarchy} currentId={id} ancestors={[]} />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3">
                <AccountTimeline events={timeline ?? []} />
              </CardContent>
            </Card>

            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart2 className="h-4 w-4 text-muted-foreground" />
                  Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 py-3">
                <AccountNotes organizationId={id} initialNotes={org.notes} />
              </CardContent>
            </Card>
          </div>
        </div>

        <PageSection title="Related Leads">
          <DataTable
            data={relatedLeads ?? []}
            columns={relatedLeadsColumns}
            getRowKey={(lead) => lead.id}
            emptyState={
              <EmptyState
                title="No related leads"
                description="Leads linked to this company will appear here."
                compact
              />
            }
            minWidth="400px"
          />
        </PageSection>

        <PageSection title="Customer 360">
          <Customer360Section data={company360} isLoading={company360Loading} />
        </PageSection>

        <PageSection title="360 Timeline">
          <Customer360Timeline companyId={id} />
        </PageSection>
      </div>

      <LinkParentDialog
        open={linkParentOpen}
        onOpenChange={handleLinkParentOpenChange}
        organizationId={id}
        currentParentId={org.parentId}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title="Delete company"
        description={`Are you sure you want to delete "${org.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
