"use client";

import { useState, useCallback } from "react";
import { RefreshCw, Users, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  useDuplicateLeads,
  useMergeLead,
  type DuplicateGroup,
} from "@/hooks/api/crm/leads";
import { cn } from "@/lib/utils";

function scoreToTone(score: number): string {
  if (score >= 80) return "bg-red-50 text-red-700 border-red-200";
  if (score >= 60) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-yellow-50 text-yellow-700 border-yellow-200";
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
    NEW: "bg-blue-50 text-blue-700 border-blue-200",
    CONTACTED: "bg-amber-50 text-amber-700 border-amber-200",
    INTERESTED: "bg-violet-50 text-violet-700 border-violet-200",
    QUALIFIED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    CONVERTED: "bg-emerald-50 text-emerald-700 border-emerald-200",
    LOST: "bg-red-50 text-red-700 border-red-200",
  };
  return map[status] ?? "bg-slate-100 text-slate-700 border-slate-200";
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

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-[11px] font-medium text-muted-foreground">
            Group #{index + 1}
          </span>
          <Badge
            variant="outline"
            className={cn("text-[9px] px-1.5 py-0 h-4", scoreToTone(group.score))}
          >
            Score: {group.score}
          </Badge>
          {group.matchReason.map((reason) => (
            <Badge
              key={reason}
              variant="outline"
              className="text-[9px] px-1.5 py-0 h-4"
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
          <div className="min-w-[640px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
                <TableRow className="border-b-2 border-border hover:bg-transparent">
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Email</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 hidden md:table-cell">Phone</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 hidden md:table-cell">Company</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5">Status</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 hidden md:table-cell">Created</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="h-8 hover:bg-muted/30 transition-colors">
                  <TableCell className="px-2 py-1 text-[11px] font-medium">{leadA.name}</TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">{leadA.email ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">{leadA.phone ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">{leadA.company ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] px-1.5 py-0 h-4", statusBadgeClass(leadA.status))}
                    >
                      {leadA.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                    {formatDate(leadA.createdAt)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <Badge
                      variant="outline"
                      className="text-[9px] px-1.5 py-0 h-4 bg-emerald-50 text-emerald-700 border-emerald-200"
                    >
                      Keep
                    </Badge>
                  </TableCell>
                </TableRow>

                <TableRow className="h-8 hover:bg-muted/30 transition-colors">
                  <TableCell className="px-2 py-1 text-[11px] font-medium">{leadB.name}</TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground">{leadB.email ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">{leadB.phone ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">{leadB.company ?? "—"}</TableCell>
                  <TableCell className="px-2 py-1">
                    <Badge
                      variant="outline"
                      className={cn("text-[9px] px-1.5 py-0 h-4", statusBadgeClass(leadB.status))}
                    >
                      {leadB.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-2 py-1 text-[11px] text-muted-foreground hidden md:table-cell">
                    {formatDate(leadB.createdAt)}
                  </TableCell>
                  <TableCell className="px-2 py-1 text-right">
                    <Button
                      size="sm"
                      variant="destructive"
                      className="h-6 text-[10px] px-2"
                      onClick={handleMergeClick}
                    >
                      Remove Duplicate
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

function DuplicatesSkeleton() {
  return (
    <div className="space-y-6">
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
        <div className="space-y-6">
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
              title="No Duplicates Found"
              description="Great news — no potential duplicate leads were detected across your pipeline."
              className="flex-1 min-h-[40vh]"
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
