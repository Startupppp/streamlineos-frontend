"use client";

import { useCallback, useMemo, useState } from "react";
import { NoPermissionState } from "@/components/shared";
import { useCanState } from "@/hooks/api/access";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, Users } from "lucide-react";
import { EmptyLeadsIllustration } from "@/components/illustrations";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { useLeadLayout } from "@/features/crm/leads/use-lead-layout";
import { RecordList, asRecordValues, type RecordValue } from "@/features/renderer";
import { useDuplicateLeads, useMergeLead, type DuplicateGroup } from "@/hooks/api/crm/leads";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { statusToneClasses } from "@/lib/design-tokens";
import { withColumns } from "@/lib/renderer/layout-adjustment";
import type { RecordLayout } from "@/lib/renderer/layout";
import { cn } from "@/lib/utils";

/**
 * Two lead records that look like the same person.
 *
 * Each group renders the shared lead description rather than a table written
 * here, which matters more on this screen than on most: the whole judgement a
 * user makes is "are these the same person", and they make it by comparing
 * fields side by side. When the comparison table was hand-written it showed six
 * fields chosen once and never revisited, painted statuses from its own colour
 * map, and formatted dates with its own `en-IN` call — so the same lead read
 * differently here than on the list it came from, which is precisely the
 * confusion a duplicate scan is supposed to remove.
 *
 * The group card, the match reasons and the merge itself stay hand-written.
 * A description describes one record; that two of them are suspected to be the
 * same person is not a fact about a lead.
 */

/** The scan's confidence that two records are one person. */
function scoreTone(score: number): "danger" | "warning" | "neutral" {
  if (score >= 80) return "danger";
  if (score >= 60) return "warning";
  return "neutral";
}

const COLUMNS = ["name", "email", "phone", "source", "status", "createdAt"] as const;

interface MergeTarget {
  keepLeadId: number;
  mergeLeadId: number;
  mergeName: string;
}

function DuplicateGroupCard({
  group,
  index,
  layout,
  onMerge,
}: {
  group: DuplicateGroup;
  index: number;
  layout: RecordLayout;
  onMerge: (target: MergeTarget) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const money = useOrgDisplay();

  const handleToggle = useCallback(() => setExpanded((previous) => !previous), []);

  const leadA = group.leads[0];
  const leadB = group.leads[1];

  const handleMergeClick = useCallback(() => {
    if (!leadA || !leadB) return;
    onMerge({ keepLeadId: leadA.id, mergeLeadId: leadB.id, mergeName: leadB.name });
  }, [onMerge, leadA, leadB]);

  const rows = useMemo(
    () => (leadA && leadB ? asRecordValues([leadA, leadB]) : []),
    [leadA, leadB],
  );

  /**
   * Which of the two survives, in the slot the engine leaves for a row's own
   * controls. Not a column in the description: that one of two records is the
   * keeper is a fact about this comparison, not about a lead.
   */
  const renderActions = useCallback(
    (row: RecordValue) => {
      if (!leadA) return null;
      if (Number(row.id) === leadA.id) {
        const tone = statusToneClasses("success");
        return (
          <Badge
            variant="outline"
            className={cn("h-4 px-1.5 py-0 text-micro", tone.surface, tone.inkStrong, tone.rule)}
          >
            Keep
          </Badge>
        );
      }
      return (
        <Button
          size="sm"
          variant="destructive"
          className="h-6 px-2 text-micro"
          onClick={handleMergeClick}
        >
          Remove duplicate
        </Button>
      );
    },
    [leadA, handleMergeClick],
  );

  if (!leadA || !leadB) return null;

  const tone = statusToneClasses(scoreTone(group.score));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-dense font-medium text-muted-foreground">Group #{index + 1}</span>
          <Badge
            variant="outline"
            className={cn("h-4 px-1.5 py-0 text-micro", tone.surface, tone.inkStrong, tone.rule)}
          >
            Score: {group.score}
          </Badge>
          {group.matchReason.map((reason) => (
            <Badge key={reason} variant="outline" className="h-4 px-1.5 py-0 text-micro">
              {reason}
            </Badge>
          ))}
          <button
            type="button"
            onClick={handleToggle}
            className="ml-auto text-muted-foreground transition-colors hover:text-foreground"
            aria-label={expanded ? "Collapse group" : "Expand group"}
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded ? (
        <CardContent className="p-0 pt-0">
          <RecordList
            layout={layout}
            rows={rows}
            getRowKey={(row) => String(row.id)}
            actions={renderActions}
            /*
              Compact, like every other table in the product. A two-row
              comparison is exactly where a spacious row hurts: the fields you
              are comparing should sit close enough to read across.
            */
            density="compact"
            money={money}
            minWidth="820px"
          />
        </CardContent>
      ) : null}
    </Card>
  );
}

function DuplicatesSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <StatCardGrid cols={2}>
        <StatCard label="Duplicate groups found" value={0} tone="red" icon={AlertTriangle} isLoading />
        <StatCard label="Leads at risk" value={0} tone="amber" icon={Users} isLoading />
      </StatCardGrid>
      <div className="flex flex-col gap-4">
        {[1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-32 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function DuplicateLeadsPage() {
  const { data, isLoading, isFetching, isError, refetch } = useDuplicateLeads();
  const { mutate: mergeLead, isPending: isMerging } = useMergeLead();

  const leadLayout = useLeadLayout();
  const layout = useMemo(() => withColumns(leadLayout, COLUMNS), [leadLayout]);

  const [pendingMerge, setPendingMerge] = useState<MergeTarget | null>(null);

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleMergeDialogOpenChange = useCallback((open: boolean) => {
    if (!open) setPendingMerge(null);
  }, []);

  const handleMerge = useCallback((target: MergeTarget) => setPendingMerge(target), []);

  const confirmMerge = useCallback(() => {
    if (!pendingMerge) return;
    mergeLead(
      { keepLeadId: pendingMerge.keepLeadId, mergeLeadId: pendingMerge.mergeLeadId },
      { onSettled: () => setPendingMerge(null) },
    );
  }, [mergeLead, pendingMerge]);

  const groups = useMemo(() => data?.groups ?? [], [data]);

  const totalLeadsAtRisk = useMemo(
    () =>
      groups.reduce((accumulator, group) => {
        group.leads.forEach((lead) => accumulator.add(lead.id));
        return accumulator;
      }, new Set<number>()).size,
    [groups],
  );

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
  if (useCanState("crm:leads:view") === "denied")
    return <NoPermissionState permission="crm:leads:view" />;

  return (
    <PageWrapper
      title="Duplicate leads"
      subtitle="Fuzzy matching across name, email, phone and company"
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={handleRetry}
          disabled={isFetching}
          aria-label="Refresh duplicate scan"
        >
          <RefreshCw className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")} />
          {isFetching ? "Scanning…" : "Refresh scan"}
        </Button>
      }
    >
      {isLoading ? (
        <DuplicatesSkeleton />
      ) : isError ? (
        <ErrorState
          title="Scan failed"
          description="The duplicate scan didn't finish. Check your connection and try again."
          onRetry={handleRetry}
          className="flex-1"
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <StatCardGrid cols={2}>
            <StatCard
              label="Duplicate groups found"
              value={data?.total ?? 0}
              tone="red"
              icon={AlertTriangle}
            />
            <StatCard label="Leads at risk" value={totalLeadsAtRisk} tone="amber" icon={Users} />
          </StatCardGrid>

          {groups.length === 0 ? (
            /*
              The "done" state rather than the "nothing here yet" one: the scan
              ran and found nothing, which is good news and should read as good
              news rather than as an empty container.
            */
            <EmptyState
              illustration={<EmptyLeadsIllustration />}
              title="No duplicates found"
              description="Every lead in your pipeline looks like a distinct person. The scan runs against name, email, phone and company."
              className="flex-1"
            />
          ) : (
            <div className="flex flex-col gap-4">
              {groups.map((group, index) => (
                <DuplicateGroupCard
                  key={`${group.leads[0]?.id}-${group.leads[1]?.id}`}
                  group={group}
                  index={index}
                  layout={layout}
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
        title="Remove duplicate lead"
        description={`This will merge "${pendingMerge?.mergeName}" into the primary lead and soft-delete it. All activities and notes will be preserved. This action cannot be undone.`}
        confirmLabel={isMerging ? "Merging…" : "Merge & remove"}
        destructive
        onConfirm={confirmMerge}
      />
    </PageWrapper>
  );
}
