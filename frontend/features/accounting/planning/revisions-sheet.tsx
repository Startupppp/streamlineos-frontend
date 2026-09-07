"use client";

import { useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AppSheet } from "@/components/shared/app-sheet";
import { ErrorState, LoadingState } from "@/components/shared";
import { EmptyState } from "@/components/ui/empty-state";
import { useBudgetRevisions } from "@/hooks/api/accounting/planning";
import { useOrgMembers } from "@/hooks/api/organization";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  getUserDisplayName,
  type NamedUser,
} from "@/lib/person-display";

function formatDate(value: string | Date | null | undefined): string {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime())
    ? String(value)
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

interface RevisionsSheetProps {
  budgetId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RevisionsSheet({ budgetId, open, onOpenChange }: RevisionsSheetProps) {
  const query = useBudgetRevisions(budgetId);
  const revisions = query.data ?? [];

  function handleRetry(): void {
    void query.refetch();
  }
  const { data: membersData } = useOrgMembers(1, 200);

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

  return (
    <AppSheet
      open={open}
      onOpenChange={onOpenChange}
      title="Revision History"
      description="All saved versions of this budget."
    >
      {query.isLoading ? (
        <LoadingState variant="table" rows={12} />
      ) : query.isError ? (
        /*
          "No revisions yet" is a statement about the budget's history; a failed
          read is a statement about the request. Conflating them told the user
          their prior versions do not exist.
        */
        <ErrorState
          compact
          title="Couldn't load revision history"
          description={getErrorMessage(query.error)}
          onRetry={handleRetry}
        />
      ) : revisions.length === 0 ? (
        <EmptyState
          compact
          illustrationPreset="activity"
          title="No revisions yet"
          description="Each time this budget is saved, a version is recorded here."
        />
      ) : (
        <div className="space-y-2">
          {revisions.map((rev) => (
            <Card key={rev.id} className="border border-border rounded-lg shadow-none">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Rev #{rev.revisionNumber}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(rev.createdAt)}</span>
                </div>
                <p className="text-xs text-muted-foreground">By {resolveMemberName(rev.createdBy)} · {rev.lineCount} lines</p>
                {rev.note && (
                  <p className="text-xs text-foreground mt-1 italic">{rev.note}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppSheet>
  );
}
