"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { SettingsIcon } from "@animateicons/react/lucide";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Money } from "@/features/accounting/shared";
import { BankTxnStatusBadge } from "./bank-txn-status-badge";
import { ReconciliationMatchPanel } from "./reconciliation-match-panel";
import { ReconciliationRulesSheet } from "./reconciliation-rules-sheet";
import { useBankAccounts, useReconciliationWorkspace } from "@/hooks/api/accounting/banking";
import { FILTER_TOOLBAR_ROW, FILTER_SELECT_TRIGGER } from "@/components/ui/content-fill-panel";
import { useCan } from "@/hooks/api/access";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared";
import { getErrorMessage } from "@/lib/get-error-message";
import type { ReconciliationTxn } from "@/hooks/api/accounting/banking";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

type TabValue = "unmatched" | "suggested";

export function ReconciliationClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const paramAccountId = searchParams.get("bankAccountId");
  const initialId = paramAccountId ? parseInt(paramAccountId, 10) : 0;

  const [selectedAccountId, setSelectedAccountId] = useState<number>(initialId);
  const [selectedTxnId, setSelectedTxnId] = useState<number | null>(null);
  const [tab, setTab] = useState<TabValue>("unmatched");
  const [rulesOpen, setRulesOpen] = useState(false);

  const canReconcile = useCan("accounting:banking:reconcile");
  const { iconRef: rulesIconRef, hoverHandlers: rulesHoverHandlers } = useAnimatedIcon();
  const accountsQuery = useBankAccounts();
  const accounts = accountsQuery.data?.data ?? [];

  const workspaceQuery = useReconciliationWorkspace(selectedAccountId);
  const workspace = workspaceQuery.data;

  const displayedTxns: ReconciliationTxn[] =
    tab === "unmatched" ? (workspace?.unmatched ?? []) : (workspace?.suggested ?? []);

  const selectedTxn: ReconciliationTxn | undefined =
    displayedTxns.find((t) => t.id === selectedTxnId) ??
    workspace?.unmatched.find((t) => t.id === selectedTxnId) ??
    workspace?.suggested.find((t) => t.id === selectedTxnId);

  function handleRetry() {
    void workspaceQuery.refetch();
    void accountsQuery.refetch();
  }

  const ledgerBalance = parseFloat(workspace?.ledgerBalance ?? "0");
  const bankBalance = parseFloat(workspace?.bankBalance ?? "0");
  const balanceDiff = Math.abs(ledgerBalance - bankBalance);
  const hasMismatch = balanceDiff > 0.01;

  const totalCount =
    (workspace?.unmatched.length ?? 0) +
    (workspace?.suggested.length ?? 0) +
    (workspace?.reconciledCount ?? 0);

  function handleAccountChange(value: string) {
    const id = parseInt(value, 10);
    setSelectedAccountId(id);
    setSelectedTxnId(null);
    router.replace(`/accounting/banking/reconciliation?bankAccountId=${id}`);
  }

  function handleTxnSelect(txn: ReconciliationTxn) {
    setSelectedTxnId(txn.id === selectedTxnId ? null : txn.id);
  }

  function handlePanelClose() {
    setSelectedTxnId(null);
  }

  function handleRulesOpen() {
    setRulesOpen(true);
  }

  return (
    <PageWrapper
      title="Reconciliation"
      subtitle="Match bank transactions to your books."
      backHref="/accounting/banking"
      actions={
        canReconcile ? (
          <Button variant="outline" size="sm" onClick={handleRulesOpen} {...rulesHoverHandlers}>
            <SettingsIcon ref={rulesIconRef} size={14} className="mr-1" />
            Rules
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <div className={`${FILTER_TOOLBAR_ROW} flex-wrap`}>
          <Select
            value={selectedAccountId ? String(selectedAccountId) : ""}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className={`w-[220px] ${FILTER_SELECT_TRIGGER}`}>
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {workspace && (
            <div className="flex items-center gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Reconciled: </span>
                <span className="font-semibold tabular-nums">
                  {workspace.reconciledCount} / {totalCount}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Ledger: </span>
                <Money value={ledgerBalance} compact />
              </div>
              <div>
                <span className="text-muted-foreground">Bank: </span>
                <Money value={bankBalance} compact />
              </div>
            </div>
          )}
        </div>

        {hasMismatch && workspace && (
          <div className="flex items-center gap-2 bg-status-warning-surface border border-status-warning-rule rounded-lg px-3 py-2 text-xs text-status-warning-ink">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Balance mismatch of <Money value={balanceDiff} className="text-status-warning-ink font-medium" />.
              Reconcile remaining transactions to close the gap.
            </span>
          </div>
        )}

        {workspaceQuery.isLoading && selectedAccountId > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : selectedAccountId === 0 ? (
          <EmptyState
            title="Select an account"
            description="Choose a bank account above to begin reconciliation."
            compact
          />
        ) : workspaceQuery.isError || accountsQuery.isError ? (
          <ErrorState
            className="flex-1"
            title="Couldn't load this reconciliation"
            description={getErrorMessage(workspaceQuery.error ?? accountsQuery.error)}
            onRetry={handleRetry}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 min-h-0">
            <div className="flex flex-col border border-border rounded-xl overflow-hidden">
              <div className="flex gap-1 p-1 border-b border-border bg-card">
                <button
                  type="button"
                  onClick={() => setTab("unmatched")}
                  className={cn(
                    "flex-1 inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors",
                    tab === "unmatched"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Unmatched ({workspace?.unmatched.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("suggested")}
                  className={cn(
                    "flex-1 inline-flex h-7 items-center justify-center rounded-md px-3 text-xs font-medium transition-colors",
                    tab === "suggested"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Suggested ({workspace?.suggested.length ?? 0})
                </button>
              </div>

              <ScrollArea hideScrollbar className="flex-1 min-h-0">
                {displayedTxns.length === 0 ? (
                  <EmptyState
                    compact
                    illustrationPreset={tab === "unmatched" ? "approval" : "search"}
                    title={
                      tab === "unmatched"
                        ? "Every transaction is matched"
                        : "No suggested matches"
                    }
                    description={
                      tab === "unmatched"
                        ? "Import a newer statement to bring in more transactions."
                        : "Match an unmatched transaction by hand, or add a rule to suggest matches automatically."
                    }
                  />
                ) : (
                  displayedTxns.map((txn) => {
                    const amount = parseFloat(txn.amount);
                    const isSelected = txn.id === selectedTxnId;
                    return (
                      <button
                        key={txn.id}
                        type="button"
                        onClick={() => handleTxnSelect(txn)}
                        className={[
                          "w-full text-left px-3 py-2.5 border-b border-border/50 transition-colors",
                          isSelected
                            ? "bg-primary/5 border-l-2 border-l-primary"
                            : "hover:bg-muted/30",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-dense text-muted-foreground tabular-nums">
                              {txn.txnDate}
                            </p>
                            <TruncatedText text={txn.description} className="text-xs font-medium text-foreground mt-0.5" />
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <Money
                              value={amount}
                              compact
                              className={amount >= 0 ? "text-status-success-ink" : "text-status-danger-ink"}
                            />
                            <BankTxnStatusBadge status={txn.status} />
                          </div>
                        </div>
                        {txn.suggestedMatches && txn.suggestedMatches.length > 0 && (
                          <p className="text-micro text-primary mt-1">
                            {txn.suggestedMatches.length} suggestion
                            {txn.suggestedMatches.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </ScrollArea>
            </div>

            <div className="border border-border rounded-xl p-4">
              {selectedTxn && canReconcile ? (
                <ReconciliationMatchPanel
                  txn={selectedTxn}
                  bankAccountId={selectedAccountId}
                  onClose={handlePanelClose}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
                  Select a transaction to reconcile.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {canReconcile && selectedAccountId > 0 && (
        <ReconciliationRulesSheet
          bankAccountId={selectedAccountId}
          open={rulesOpen}
          onOpenChange={setRulesOpen}
        />
      )}
    </PageWrapper>
  );
}
