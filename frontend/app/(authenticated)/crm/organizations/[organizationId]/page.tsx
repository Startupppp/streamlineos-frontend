"use client";

import { useState, use, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Globe,
  Users,
  Link2,
  Mail,
  Phone,
  ChevronLeft,
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
import { StatCard } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
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
} from "@/hooks/api/crm";
import { AccountHealthBadge, computeHealthScore } from "@/features/crm/organizations/detail/account-health-badge";
import { HierarchyTree } from "@/features/crm/organizations/detail/hierarchy-tree";
import { AccountTimeline } from "@/features/crm/organizations/detail/account-timeline";
import { AccountNotes } from "@/features/crm/organizations/detail/account-notes";
import { LinkParentDialog } from "@/features/crm/organizations/detail/link-parent-dialog";
import { formatCurrency } from "@/lib/format-utils";
import { cn } from "@/lib/utils";

function LeadStatusBadge({ status }: { status: string }) {
  const upper = status.toUpperCase();
  const colorMap: Record<string, string> = {
    NEW: "bg-blue-500/10 text-blue-600",
    CONTACTED: "bg-cyan-500/10 text-cyan-600",
    QUALIFIED: "bg-emerald-500/10 text-emerald-600",
    DISQUALIFIED: "bg-red-500/10 text-red-600",
    CONVERTED: "bg-purple-500/10 text-purple-600",
    LOST: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={cn("text-[10px] border-0 capitalize", colorMap[upper] ?? "bg-muted text-muted-foreground")}>
      {status.toLowerCase().replace(/_/g, " ")}
    </Badge>
  );
}

function LeadPriorityBadge({ priority }: { priority: string }) {
  const upper = priority.toUpperCase();
  const colorMap: Record<string, string> = {
    HIGH: "bg-red-500/10 text-red-600",
    MEDIUM: "bg-amber-500/10 text-amber-600",
    LOW: "bg-muted text-muted-foreground",
  };
  return (
    <Badge className={cn("text-[10px] border-0 capitalize", colorMap[upper] ?? "bg-muted text-muted-foreground")}>
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

function DetailPageSkeleton() {
  return (
    <PageWrapper title="Organization" subtitle="Loading...">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-40" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48" />
            <Skeleton className="h-40" />
          </div>
        </div>
        <Skeleton className="h-48" />
      </div>
    </PageWrapper>
  );
}

export default function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ organizationId: string }>;
}) {
  const { organizationId } = use(params);
  const id = Number(organizationId);
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
        toast.success("Organization deleted");
        router.push("/crm/organizations");
      },
      onError: (e) => toast.error(e.message),
    });
  }, [id, deleteMutation, router]);

  if (orgLoading) return <DetailPageSkeleton />;

  if (!org) {
    return (
      <PageWrapper title="Not Found" subtitle="">
        <EmptyState
          title="Organization not found"
          description="This organization may have been deleted or you don't have access."
          action={{ label: "Back to Organizations", href: "/crm/organizations" }}
          className="min-h-[50vh]"
        />
      </PageWrapper>
    );
  }

  const displayScore = org.healthScore ?? (rollup ? computeHealthScore(rollup) : null);

  return (
    <PageWrapper
      title={org.name}
      eyebrow="Organizations"
      subtitle={org.description ?? org.industry ?? undefined}
      actions={
        <div className="flex items-center gap-2">
          <AccountHealthBadge healthScore={displayScore} />
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleOpenLinkParent}>
            <GitBranch className="h-3.5 w-3.5" />
            {org.parentId ? "Change Parent" : "Link Parent"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-xs" asChild>
            <Link href={`/crm/organizations/${id}/edit`}>
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleOpenDelete}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" asChild>
            <Link href="/crm/organizations">
              <ChevronLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </Button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label="Total Deal Value"
            value={rollup ? formatCurrency(rollup.totalDealValue) : "—"}
            icon={DollarSign}
            color="green"
            index={0}
          />
          <StatCard
            label="Active Deals"
            value={rollup?.openDeals ?? "—"}
            icon={TrendingUp}
            color="blue"
            index={1}
          />
          <StatCard
            label="Open Leads"
            value={rollup?.totalLeads ?? "—"}
            icon={Inbox}
            color="amber"
            index={2}
          />
          <StatCard
            label="Total Contacts"
            value={rollup?.totalContacts ?? "—"}
            icon={Users}
            color="violet"
            index={3}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <Card className="shadow-sm">
              <CardHeader className="px-4 py-3 border-b">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  Organization Info
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
                      <Link href={`/crm/organizations/${org.parentId}`} className="text-blue-600 hover:underline">
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
                    Org Hierarchy
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
          {(relatedLeads?.length ?? 0) === 0 ? (
            <EmptyState
              title="No related leads"
              description="Leads linked to this organization will appear here."
              compact
            />
          ) : (
            <Card className="shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Name</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Status</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Priority</th>
                      <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {relatedLeads?.map((lead) => (
                      <tr key={lead.id} className="border-b border-border/50 last:border-0 hover:bg-accent/40 transition-colors">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-blue-500/10 flex items-center justify-center text-[10px] font-semibold text-blue-600 shrink-0">
                              {(lead.name ?? "?")[0]?.toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-medium truncate">{lead.name ?? "—"}</p>
                              {lead.email && (
                                <p className="text-[10px] text-muted-foreground truncate">{lead.email}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <LeadStatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-2.5">
                          <LeadPriorityBadge priority={lead.priority} />
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">
                          {lead.source?.toLowerCase().replace(/_/g, " ") ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
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
        title="Delete organization"
        description={`Are you sure you want to delete "${org.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
      />
    </PageWrapper>
  );
}
