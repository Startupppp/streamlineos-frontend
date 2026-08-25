"use client";

import { useState, useCallback } from "react";
import { RefreshCw, Users, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useDuplicateLeads,
  useMergeLead,
  type DuplicateGroup,
} from "@/hooks/api/crm/leads";
import { cn } from "@/lib/utils";
import { TruncatedText } from "@/components/ui/truncated-text";

function scoreToTone(score: number): string {
  if (score >= 80) return "bg-status-danger-surface text-status-danger-ink border-status-danger-rule";
  if (score >= 60) return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
  return "bg-status-warning-surface text-status-warning-ink border-status-warning-rule";
}

function formatDate(val: string | null): string {
  if (!val) return "—";
  return new Date(val).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function statusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    NEW: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    CONTACTED: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
    INTERESTED: "bg-status-info-surface text-status-info-ink border-status-info-rule",
    QUALIFIED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    CONVERTED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
    LOST: "bg-status-danger-surface text-status-danger-ink border-status-danger-rule",
  };
  return map[status] ?? "bg-muted text-muted-foreground border-border";
}

interface MergeTarget {
  keepLeadId: number;
  mergeLeadId: number;
  mergeName: string;
}

function DuplicateGroupCard({
  group,
  index,
  onMerge,
}: {
  group: DuplicateGroup;
  index: number;
  onMerge: (target: MergeTarget) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  const handleToggle = useCallback(() => setExpanded((p) => !p), []);

  const leadA = group.leads[0];
  const leadB = group.leads[1];

  const handleMergeClick = useCallback(() => {
    if (!leadA || !leadB) return;
    onMerge({ keepLeadId: leadA.id, mergeLeadId: leadB.id, mergeName: leadB.name });
  }, [onMerge, leadA, leadB]);

  if (!leadA || !leadB) return null;

  type DuplicateLead = DuplicateGroup["leads"][number] & { _isKeep: boolean };

  const tableData: DuplicateLead[] = [
    { ...leadA, _isKeep: true },
    { ...leadB, _isKeep: false },
  ];

  const columns: DataTableColumn<DuplicateLead>[] = [
    {
      key: "name",
      header: "Name",
      cell: (row) => <TruncatedText text={row.name} className="text-dense font-medium max-w-[120px]" />,
    },
    {
      key: "email",
      header: "Email",
      cell: (row) => <span className="text-dense text-muted-foreground break-all">{row.email ?? "—"}</span>,
    },
    {
      key: "phone",
      header: "Phone",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (row) => <span className="text-dense text-muted-foreground">{row.phone ?? "—"}</span>,
    },
    {
      key: "company",
      header: "Company",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (row) => <span className="text-dense text-muted-foreground">{row.company ?? "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge
          variant="outline"
          className={cn("text-micro px-1.5 py-0 h-4", statusBadgeClass(row.status))}
        >
          {row.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "hidden md:table-cell",
      className: "hidden md:table-cell",
      cell: (row) => <span className="text-dense text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "action",
      header: "Action",
      headerClassName: "text-right",
      className: "text-right",
      cell: (row) => row._isKeep ? (
        <Badge
          variant="outline"
          className="text-micro px-1.5 py-0 h-4 bg-status-success-surface text-status-success-ink border-status-success-rule"
        >
          Keep
        </Badge>
      ) : (
        <Button
          size="sm"
          variant="destructive"
          className="h-6 text-micro px-2"
          onClick={handleMergeClick}
        >
          Remove Duplicate
        </Button>
      ),
    },
  ];

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-dense font-medium text-muted-foreground">
            Group #{index + 1}
          </span>
          <Badge
            variant="outline"
            className={cn("text-micro px-1.5 py-0 h-4", scoreToTone(group.score))}
          >
            Score: {group.score}
          </Badge>
          {group.matchReason.map((reason) => (
            <Badge
              key={reason}
              variant="outline"
              className="text-micro px-1.5 py-0 h-4"
            >
              {reason}
            </Badge>
          ))}
          <button
            type="button"
            onClick={handleToggle}
            className="ml-auto text-muted-foreground hover:text-foreground transition-colors"
            aria-label={expanded ? "Collapse group" : "Expand group"}
          >
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="pt-0 overflow-x-auto p-0">
          <DataTable
            data={tableData}
            columns={columns}
            getRowKey={(row) => row.id}
            minWidth="640px"
          />
        </CardContent>
      )}
    </Card>
  );
}

function DuplicatesSkeleton() {
  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      <StatCardGrid cols={2}>
        <StatCard label="Duplicate Groups Found" value={0} tone="red" icon={AlertTriangle} isLoading />
        <StatCard label="Leads at Risk" value={0} tone="amber" icon={Users} isLoading />
      </StatCardGrid>
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function DuplicateLeadsPage() {
  const { data, isLoading, isFetching, isError, refetch } = useDuplicateLeads();
  const { mutate: mergeLead, isPending: isMerging } = useMergeLead();

  const [pendingMerge, setPendingMerge] = useState<MergeTarget | null>(null);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleMergeDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setPendingMerge(null);
  }, []);

  const handleMerge = useCallback((target: MergeTarget) => {
    setPendingMerge(target);
  }, []);

  const confirmMerge = useCallback(() => {
    if (!pendingMerge) return;
    mergeLead(
      { keepLeadId: pendingMerge.keepLeadId, mergeLeadId: pendingMerge.mergeLeadId },
      { onSettled: () => setPendingMerge(null) },
    );
  }, [mergeLead, pendingMerge]);

  const totalLeadsAtRisk = (data?.groups ?? []).reduce((acc, g) => {
    g.leads.forEach((l) => acc.add(l.id));
    return acc;
  }, new Set<number>()).size;

  const refreshButton = (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRetry}
      disabled={isFetching}
      aria-label="Refresh duplicate scan"
    >
      <RefreshCw className={cn("h-4 w-4 mr-2", isFetching && "animate-spin")} />
      {isFetching ? "Scanning…" : "Refresh Scan"}
    </Button>
  );

  return (
    <PageWrapper
      title="Duplicate Leads"
      subtitle="Fuzzy matching to find potential duplicate leads across name, email, phone, and company"
      actions={refreshButton}
    >
      {isLoading ? (
        <DuplicatesSkeleton />
      ) : isError ? (
        <ErrorState
          title="Scan failed"
          description="Failed to scan for duplicate leads. Please try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <div className="flex flex-col flex-1 min-h-0 space-y-4">
          <StatCardGrid cols={2}>
            <StatCard
              label="Duplicate Groups Found"
              value={data?.total ?? 0}
              tone="red"
              icon={AlertTriangle}
            />
            <StatCard
              label="Leads at Risk"
              value={totalLeadsAtRisk}
              tone="amber"
              icon={Users}
            />
          </StatCardGrid>

          {!data?.groups.length ? (
            <EmptyState
              illustration={<EmptyLeadsIllustration />}
              title="No Duplicates Found"
              description="Great news — no potential duplicate leads were detected across your pipeline."
              className="flex-1"
            />
          ) : (
            <div className="space-y-4">
              {data.groups.map((group, index) => (
                <DuplicateGroupCard
                  key={`${group.leads[0]?.id}-${group.leads[1]?.id}`}
                  group={group}
                  index={index}
                  onMerge={handleMerge}
                />
              ))}
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!pendingMerge}
        onOpenChange={handleMergeDialogOpenChange}
        title="Remove Duplicate Lead"
        description={`This will merge "${pendingMerge?.mergeName}" into the primary lead and soft-delete it. All activities and notes will be preserved. This action cannot be undone.`}
        confirmLabel={isMerging ? "Merging…" : "Merge & Remove"}
        destructive
        onConfirm={confirmMerge}
      />
    </PageWrapper>
  );
}
