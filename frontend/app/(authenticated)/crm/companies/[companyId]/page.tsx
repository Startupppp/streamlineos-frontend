"use client";

import { useState, use, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  TrendingUp,
  BarChart2,
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
import {
  useCrmOrganizationDetail,
  useCrmOrgHierarchy,
  useCrmOrgRollup,
  useCrmOrgTimeline,
  useCrmOrgRelatedLeads,
  useDeleteCrmOrganization,
  useCompany360,
} from "@/hooks/api/crm";
import { AccountHealthBadge, computeHealthScore } from "@/features/crm/companies/detail/account-health-badge";
import { HierarchyTree } from "@/features/crm/companies/detail/hierarchy-tree";
import { AccountTimeline } from "@/features/crm/companies/detail/account-timeline";
import { AccountNotes } from "@/features/crm/companies/detail/account-notes";
import { LinkParentDialog } from "@/features/crm/companies/detail/link-parent-dialog";
import { CompanySheet } from "@/features/crm/companies/company-sheet";
import { RecordDetail, RecordList, asRecordValue, asRecordValues } from "@/components/renderer";
import { useTenantLayout } from "@/components/renderer/use-tenant-layout";
import { COMPANY_LAYOUT } from "@/lib/renderer/crm/company-layout";
import { withColumns } from "@/lib/renderer/layout-adjustment";
import { useLeadLayout } from "@/features/crm/leads/use-lead-layout";
import { useCan, useCanState } from "@/hooks/api/access";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { Customer360Section } from "@/features/crm/shared/customer-360-section";
import { Customer360Timeline } from "@/features/crm/shared/customer-360-timeline";
import { formatCurrency } from "@/lib/format-utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { ErrorState } from "@/components/shared/error-state";
import { NoPermissionState } from "@/components/shared/no-permission-state";

/** How this panel frames a lead: who they are, where they are, and how they arrived. */
const RELATED_LEAD_COLUMNS = ["name", "email", "status", "priority", "source"] as const;

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
  const [editOpen, setEditOpen] = useState(false);

  const layout = useTenantLayout(COMPANY_LAYOUT);
  const money = useOrgDisplay();
  const canManage = useCan("crm:organizations:manage");

  const { data: org, isLoading: orgLoading, isError: orgError, error: orgDetailError, refetch: refetchOrg } = useCrmOrganizationDetail(id);
  const { data: rollup } = useCrmOrgRollup(id);
  const { data: hierarchy } = useCrmOrgHierarchy(id);
  const { data: timeline, isLoading: timelineLoading } = useCrmOrgTimeline(id);
  const {
    data: relatedLeads,
    isLoading: relatedLeadsLoading,
    isError: relatedLeadsError,
    refetch: refetchRelatedLeads,
  } = useCrmOrgRelatedLeads(id);
  const { data: company360, isLoading: company360Loading } = useCompany360(id);
  const deleteMutation = useDeleteCrmOrganization();

  /*
    The leads on this company are leads, so they are described by the lead
    description rather than by a fourth column array written on a company page.
    `useLeadLayout` carries the tenant's own status and priority vocabulary,
    which is what the two `CrmOptionBadge` calls here used to fetch for
    themselves — the same fact, now read once for every lead surface.
  */
  const leadLayout = useLeadLayout();
  const relatedLeadsLayout = useMemo(
    () => withColumns(leadLayout, RELATED_LEAD_COLUMNS),
    [leadLayout],
  );
  const relatedLeadRows = useMemo(
    () => asRecordValues(relatedLeads ?? []),
    [relatedLeads],
  );

  const handleOpenLinkParent = useCallback(() => setLinkParentOpen(true), []);
  const handleLinkParentOpenChange = useCallback((open: boolean) => setLinkParentOpen(open), []);
  const handleOpenDelete = useCallback(() => setDeleteOpen(true), []);
  const handleDeleteOpenChange = useCallback((open: boolean) => setDeleteOpen(open), []);
  const handleOpenEdit = useCallback(() => setEditOpen(true), []);
  const handleEditOpenChange = useCallback((open: boolean) => setEditOpen(open), []);

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

  const handleRetryRelatedLeads = useCallback(() => { void refetchRelatedLeads(); }, [refetchRelatedLeads]);

  /**
   * Ticket 26. The read below disables itself without this permission, and a
   * disabled query in TanStack Query v5 reports `isLoading: false` with no rows
   * -- the same flags an empty result has. Without this guard the branches under
   * it tell somebody their data does not exist, when the truth is that they are
   * not allowed to see it.
   *
   * Checked before the loading branch on purpose: a query that was never allowed
   * to run has no loading state worth waiting for.
   */
  if (useCanState("crm:organizations:view") === "denied")
    return <NoPermissionState permission="crm:organizations:view" />;

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
          {canManage ? (
            <>
              <Button variant="outline" onClick={handleOpenLinkParent}>
                <GitBranch className="h-3.5 w-3.5" />
                {org.parentId ? "Change Parent" : "Link Parent"}
              </Button>
              <Button variant="default" onClick={handleOpenEdit}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
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
          ) : null}
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
            <RecordDetail layout={layout} record={asRecordValue(org)} money={money} showTitle={false} />

            {org.parentId ? (
              <p className="text-sm">
                <span className="text-muted-foreground">Parent company: </span>
                <Link
                  href={`/crm/companies/${org.parentId}`}
                  className="text-primary hover:underline"
                >
                  View parent
                </Link>
              </p>
            ) : null}

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
                <AccountTimeline events={timeline ?? []} isLoading={timelineLoading} />
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
          {relatedLeadsError ? (
            <ErrorState
              compact
              title="Couldn't load related leads"
              description="The leads on this company didn't load. Check your connection and try again."
              onRetry={handleRetryRelatedLeads}
            />
          ) : (
            <RecordList
              layout={relatedLeadsLayout}
              rows={relatedLeadRows}
              getRowKey={(row) => String(row.id)}
              isLoading={relatedLeadsLoading}
              density="compact"
              money={money}
              emptyState={
                <EmptyState
                  title="No leads from this company"
                  description="Set this company on a lead and it shows up here, alongside its deals and contacts."
                  compact
                />
              }
              minWidth="560px"
            />
          )}
        </PageSection>

        <PageSection title="Customer 360">
          <Customer360Section data={company360} isLoading={company360Loading} />
        </PageSection>

        <PageSection title="360 Timeline">
          <Customer360Timeline companyId={id} />
        </PageSection>
      </div>

      <CompanySheet open={editOpen} onOpenChange={handleEditOpenChange} company={org} />

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
