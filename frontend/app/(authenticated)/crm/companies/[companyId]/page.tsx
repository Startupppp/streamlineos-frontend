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
import { Badge } from "@/components/ui/badge";
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
} from "@/hooks/api/crm";
import { AccountHealthBadge, computeHealthScore } from "@/features/crm/companies/detail/account-health-badge";
import { HierarchyTree } from "@/features/crm/companies/detail/hierarchy-tree";
import { AccountTimeline } from "@/features/crm/companies/detail/account-timeline";
import { AccountNotes } from "@/features/crm/companies/detail/account-notes";
import { LinkParentDialog } from "@/features/crm/companies/detail/link-parent-dialog";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";
import type { RelatedLead } from "@/types/crm";

function LeadStatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  const colorMap: Record<string, string> = {
    NEW: "bg-blue-50 text-blue-700 border-blue-200",
    CONTACTED: "bg-blue-50 text-blue-700 border-blue-200",
    QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    DISQUALIFIED: "bg-red-50 text-red-700 border-red-200",
    CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    LOST: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const classes = colorMap[upper] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 capitalize", classes)}>
      {status.toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}

function LeadPriorityBadge({ priority }: { priority: string }) {
  const upper = priority.toUpperCase();
  const colorMap: Record<string, string> = {
    HIGH: "bg-red-50 text-red-700 border-red-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    LOW: "bg-slate-100 text-slate-700 border-slate-200",
  };
  const classes = colorMap[upper] ?? "bg-slate-100 text-slate-700 border-slate-200";
  return (
    <Badge variant="outline" className={cn("text-[9px] px-1.5 py-0 h-4 capitalize", classes)}>
      {priority.toLowerCase()}
    </Badge>
  );
}

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

const relatedLeadsColumns: DataTableColumn<RelatedLead>[] = [
  {
    key: "name",
    header: "Name",
    cell: (lead) => (
      <div className="flex items-center gap-2">
        <div className="h-5 w-5 rounded-full bg-blue-50 flex items-center justify-center text-[9px] font-semibold text-blue-600 shrink-0">
          {(lead.name ?? "?")[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{lead.name ?? "—"}</p>
          {lead.email && (
            <p className="text-[10px] text-muted-foreground truncate">{lead.email}</p>
          )}
        </div>
      </div>
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (lead) => <LeadStatusBadge status={lead.status} />,
  },
  {
    key: "priority",
    header: "Priority",
    cell: (lead) => <LeadPriorityBadge priority={lead.priority} />,
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

function DetailPageSkeleton() {
  return (
    <PageWrapper title="Company" subtitle="Loading..." backHref="/crm/companies">
      <div className="space-y-4">
        <StatCardGrid cols={4}>
          <StatCard label="Total Deal Value" value="" icon={DollarSign} tone="emerald" isLoading />
          <StatCard label="Active Deals" value="" icon={TrendingUp} tone="blue" isLoading />
          <StatCard label="Open Leads" value="" icon={Inbox} tone="amber" isLoading />
          <StatCard label="Total Contacts" value="" icon={Users} tone="violet" isLoading />
        </StatCardGrid>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent className="px-4 py-3 space-y-2">
                {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}
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

  const { data: org, isLoading: orgLoading } = useCrmOrganizationDetail(id);
  const { data: rollup } = useCrmOrgRollup(id);
  const { data: hierarchy } = useCrmOrgHierarchy(id);
  const { data: timeline } = useCrmOrgTimeline(id);
  const { data: relatedLeads } = useCrmOrgRelatedLeads(id);
  const deleteMutation = useDeleteCrmOrganization();

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
      onError: (e) => toast.error(e.message),
    });
  }, [id, deleteMutation, router]);

  if (orgLoading) return <DetailPageSkeleton />;

  if (!org) {
    return (
      <PageWrapper title="Not Found" subtitle="" backHref="/crm/companies">
        <EmptyState
          title="Company not found"
          description="This company may have been deleted or you don't have access."
          action={{ label: "Back to Companies", href: "/crm/companies" }}
          className="min-h-[50vh]"
        />
      </PageWrapper>
    );
  }

  const displayScore = org.healthScore ?? (rollup ? computeHealthScore(rollup) : null);

  return (
    <PageWrapper
      title={org.name}
      eyebrow="Companies"
      subtitle={org.description ?? org.industry ?? undefined}
      backHref="/crm/companies"
      actions={
        <>
          <AccountHealthBadge healthScore={displayScore} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleOpenLinkParent}>
            <GitBranch className="h-3.5 w-3.5" />
            {org.parentId ? "Change Parent" : "Link Parent"}
          </Button>
          <Button variant="default" size="sm" className="gap-1.5 text-xs" asChild>
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
            color="violet"
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
                      <a href={org.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate block max-w-[180px]">
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
                      <a href={org.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
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
                      <Link href={`/crm/companies/${org.parentId}`} className="text-blue-600 hover:underline">
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
