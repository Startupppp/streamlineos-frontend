"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/ui/page-wrapper";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  TABS_CONTENT_PAGE_BODY_CLASS,
} from "@/components/ui/tabs";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState, NoPermissionState } from "@/components/shared";
import { Skeleton } from "@/components/ui/skeleton";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getErrorMessage } from "@/lib/get-error-message";
import { formatShortDate } from "@/lib/date-utils";
import { useCan } from "@/hooks/api/access";
import {
  useBankStatement,
  useBankStatements,
  useMarkStatementReconciled,
  useReconciliationProof,
  useUnmatchStatementLine,
} from "@/hooks/api/accounting/banking";
import { useUrlListState } from "../lib/use-url-list-state";
import { MatchSuggestionsPanel } from "./match-suggestions-panel";
import { RecProofPanel } from "./rec-proof-panel";
import { StatementLinesPanel } from "./statement-lines-panel";
import { UnreconciledSplitView } from "./unreconciled-split-view";

const LINES_PAGE_SIZE = 25;

export function ReconciliationPage() {
  const canRead = useCan("accounting:banking:read");
  const canReconcile = useCan("accounting:banking:reconcile");

  const { getParam, setParams, page, setPage } = useUrlListState();
  const statementId = getParam("statementId");
  const tab = getParam("tab") || "match";
  const [selectedLineId, setSelectedLineId] = useState<string | null>(null);

  const statementsQuery = useBankStatements({ page: 1, pageSize: 50 });
  const statements = useMemo(() => statementsQuery.data?.items ?? [], [statementsQuery.data]);
  const activeStatementId = statementId || statements[0]?.id || "";

  const statementQuery = useBankStatement(
    activeStatementId,
    { page, pageSize: LINES_PAGE_SIZE },
    { enabled: !!activeStatementId },
  );
  const proofQuery = useReconciliationProof(activeStatementId, {
    enabled: !!activeStatementId,
  });
  const unmatchLine = useUnmatchStatementLine();
  const markReconciled = useMarkStatementReconciled();

  const unmatchedIds = useMemo(
    () => new Set((proofQuery.data?.unmatchedStatementLines ?? []).map((line) => line.id)),
    [proofQuery.data],
  );

  function handleStatementChange(value: string): void {
    setSelectedLineId(null);
    setParams({ statementId: value });
  }

  function handleUnmatch(lineId: string): void {
    unmatchLine.mutate(lineId, {
      onSuccess: () => toast.success("Match undone"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  function handleMarkReconciled(): void {
    if (!activeStatementId) return;
    markReconciled.mutate(activeStatementId, {
      onSuccess: () => toast.success("Period signed off"),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  if (!canRead) {
    return (
      <PageWrapper title="Is this money actually there?">
        <NoPermissionState permission="accounting:banking:read" />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper
      title="Is this money actually there?"
      subtitle="Line up what the bank showed against what the books recorded, and see exactly why they differ."
      backHref="/accounting/banking"
      backLabel="Back to banking"
      noInternalScroll
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      filters={
        <div className={FILTER_TOOLBAR_ROW}>
          <Select value={activeStatementId} onValueChange={handleStatementChange}>
            <SelectTrigger className={FILTER_SELECT_TRIGGER}>
              <SelectValue placeholder="Choose a statement" />
            </SelectTrigger>
            <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
              {statements.map((statement) => (
                <SelectItem key={statement.id} value={statement.id}>
                  {formatShortDate(statement.periodStart)} – {formatShortDate(statement.periodEnd)}
                  {statement.reconciledAt ? " · signed off" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      {statementsQuery.isError ? (
        <ErrorState
          className="flex-1"
          title="Couldn't load your statements"
          description={getErrorMessage(statementsQuery.error)}
          onRetry={() => void statementsQuery.refetch()}
        />
      ) : statementsQuery.isPending ? (
        <div className="flex flex-1 flex-col gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : statements.length === 0 ? (
        <EmptyState
          className="flex-1 min-h-[40vh]"
          title="No statements yet"
          description="Bring a bank statement in and you can check it against the books line by line."
          action={{ label: "Bring in a statement", href: "/accounting/banking/import" }}
        />
      ) : (
        <Tabs
          value={tab}
          onValueChange={(value) => setParams({ tab: value === "match" ? undefined : value }, true)}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList>
            <TabsTrigger value="match">Line by line</TabsTrigger>
            <TabsTrigger value="unexplained">Still unexplained</TabsTrigger>
          </TabsList>

          <TabsContent value="match" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            <div className="flex min-h-0 flex-1 flex-col gap-4">
              {proofQuery.isError ? (
                <ErrorState
                  compact
                  title="Couldn't work out the reconciliation"
                  description={getErrorMessage(proofQuery.error)}
                  onRetry={() => void proofQuery.refetch()}
                />
              ) : proofQuery.data ? (
                <RecProofPanel
                  proof={proofQuery.data}
                  canReconcile={canReconcile}
                  isReconciling={markReconciled.isPending}
                  onMarkReconciled={handleMarkReconciled}
                />
              ) : (
                <Skeleton className="h-64 w-full" />
              )}

              <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
                <StatementLinesPanel
                  lines={statementQuery.data?.lines ?? []}
                  currency={statementQuery.data?.currency ?? "INR"}
                  unmatchedIds={unmatchedIds}
                  selectedLineId={selectedLineId}
                  isLoading={statementQuery.isPending}
                  isUnmatching={unmatchLine.isPending}
                  canReconcile={canReconcile}
                  page={page}
                  pageSize={LINES_PAGE_SIZE}
                  total={statementQuery.data?.lineCount ?? 0}
                  onPageChange={setPage}
                  onSelectLine={setSelectedLineId}
                  onUnmatch={handleUnmatch}
                />
                <MatchSuggestionsPanel
                  statementLineId={selectedLineId}
                  canReconcile={canReconcile}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="unexplained" className={TABS_CONTENT_PAGE_BODY_CLASS}>
            {proofQuery.data ? (
              <UnreconciledSplitView
                accountId={proofQuery.data.accountId}
                asOf={proofQuery.data.periodEnd}
              />
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </TabsContent>
        </Tabs>
      )}
    </PageWrapper>
  );
}
