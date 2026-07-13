"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Settings2, AlertTriangle } from "lucide-react";
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
import { Money } from "@/features/accounting/shared";
import { BankTxnStatusBadge } from "./bank-txn-status-badge";
import { ReconciliationMatchPanel } from "./reconciliation-match-panel";
import { ReconciliationRulesSheet } from "./reconciliation-rules-sheet";
import { useBankAccounts, useReconciliationWorkspace } from "@/hooks/api/accounting/banking";
import { useCan } from "@/hooks/api/access";
import type { ReconciliationTxn } from "@/hooks/api/accounting/banking";

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
  const accountsQuery = useBankAccounts();
  const accounts = accountsQuery.data?.items ?? [];

  const workspaceQuery = useReconciliationWorkspace(selectedAccountId);
  const workspace = workspaceQuery.data;

  const displayedTxns: ReconciliationTxn[] =
    tab === "unmatched" ? (workspace?.unmatched ?? []) : (workspace?.suggested ?? []);

  const selectedTxn: ReconciliationTxn | undefined =
    displayedTxns.find((t) => t.id === selectedTxnId) ??
    workspace?.unmatched.find((t) => t.id === selectedTxnId) ??
    workspace?.suggested.find((t) => t.id === selectedTxnId);

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
      eyebrow="Banking"
      title="Reconciliation"
      subtitle="Match bank transactions to your books."
      backHref="/accounting/banking"
      actions={
        canReconcile ? (
          <Button variant="outline" size="sm" onClick={handleRulesOpen}>
            <Settings2 className="h-4 w-4 mr-1" />
            Rules
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            value={selectedAccountId ? String(selectedAccountId) : ""}
            onValueChange={handleAccountChange}
          >
            <SelectTrigger className="h-9 w-[220px] text-sm">
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
          <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 rounded-lg px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>
              Balance mismatch of <Money value={balanceDiff} className="text-amber-900 font-medium" />.
              Reconcile remaining transactions to close the gap.
            </span>
          </div>
        )}

        {workspaceQuery.isLoading && selectedAccountId > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
            <Skeleton className="h-64 rounded-xl" />
          </div>
        ) : selectedAccountId === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground text-sm">
            Select an account to begin reconciliation.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 min-h-[400px]">
            <div className="flex flex-col border border-border rounded-xl overflow-hidden">
              <div className="flex border-b border-border">
                <button
                  type="button"
                  onClick={() => setTab("unmatched")}
                  className={[
                    "flex-1 py-2 px-3 text-xs font-medium transition-colors",
                    tab === "unmatched"
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600 dark:border-blue-500"
                      : "text-muted-foreground hover:bg-muted/30",
                  ].join(" ")}
                >
                  Unmatched ({workspace?.unmatched.length ?? 0})
                </button>
                <button
                  type="button"
                  onClick={() => setTab("suggested")}
                  className={[
                    "flex-1 py-2 px-3 text-xs font-medium transition-colors",
                    tab === "suggested"
                      ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-b-2 border-blue-600 dark:border-blue-500"
                      : "text-muted-foreground hover:bg-muted/30",
                  ].join(" ")}
                >
                  Suggested ({workspace?.suggested.length ?? 0})
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                {displayedTxns.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-xs text-muted-foreground">
                    {tab === "unmatched" ? "All transactions matched!" : "No suggested matches."}
                  </div>
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
                            ? "bg-blue-50 dark:bg-blue-500/10 border-l-2 border-l-blue-500"
                            : "hover:bg-muted/30",
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-[11px] text-muted-foreground tabular-nums">
                              {txn.txnDate}
                            </p>
                            <p className="text-xs font-medium text-foreground truncate mt-0.5">
                              {txn.description.length > 38
                                ? `${txn.description.slice(0, 38)}…`
                                : txn.description}
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-1">
                            <Money
                              value={amount}
                              compact
                              className={amount >= 0 ? "text-emerald-600" : "text-red-600"}
                            />
                            <BankTxnStatusBadge status={txn.status} />
                          </div>
                        </div>
                        {txn.suggestedMatches && txn.suggestedMatches.length > 0 && (
                          <p className="text-[10px] text-blue-600 dark:text-blue-400 mt-1">
                            {txn.suggestedMatches.length} suggestion
                            {txn.suggestedMatches.length > 1 ? "s" : ""}
                          </p>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
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
