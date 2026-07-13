"use client";

import { useState, type KeyboardEvent } from "react";
import { X, DollarSign, FileText, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AppDialog } from "@/components/shared/app-dialog";
import { Money } from "@/features/accounting/shared";
import { BankTxnStatusBadge } from "./bank-txn-status-badge";
import { useConfirmMatch, useUnmatch, useIgnoreTransaction } from "@/hooks/api/accounting/banking";
import type { ReconciliationTxn, MatchType } from "@/hooks/api/accounting/banking";
import { useAccounts } from "@/hooks/api/accounting";

interface Props {
  txn: ReconciliationTxn;
  bankAccountId: number;
  onClose: () => void;
}

const MATCH_TYPE_ICONS: Record<MatchType, React.ElementType> = {
  CUSTOMER_PAYMENT: DollarSign,
  VENDOR_PAYMENT: DollarSign,
  MANUAL_JOURNAL: FileText,
  BANK_FEE: DollarSign,
  TRANSFER: ArrowLeftRight,
};

export function ReconciliationMatchPanel({ txn, bankAccountId, onClose }: Props) {
  const [journalDialogOpen, setJournalDialogOpen] = useState(false);
  const [counterAccountId, setCounterAccountId] = useState("");
  const [memo, setMemo] = useState("");

  const confirmMatch = useConfirmMatch(bankAccountId);
  const unmatch = useUnmatch(bankAccountId);
  const ignoreTransaction = useIgnoreTransaction(bankAccountId);
  const accountsQuery = useAccounts({ pageSize: 200 });
  const ledgerAccounts = accountsQuery.data?.items ?? [];

  const amount = parseFloat(txn.amount);
  const isReconciled = txn.status === "RECONCILED" || txn.status === "MATCHED";

  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);
  const suggestions = txn.suggestedMatches ?? [];

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter" && suggestions.length > 0) {
      const s = suggestions[selectedSuggestionIndex];
      if (s) {
        handleConfirmSuggestion(s.id, s.matchedType);
      }
    }
    if (e.key === "ArrowDown") {
      setSelectedSuggestionIndex((i) => Math.min(i + 1, suggestions.length - 1));
    }
    if (e.key === "ArrowUp") {
      setSelectedSuggestionIndex((i) => Math.max(i - 1, 0));
    }
  }

  function handleConfirmSuggestion(matchedRecordId: number, matchType: MatchType) {
    confirmMatch.mutate(
      { transactionId: txn.id, matchType, matchedRecordId },
      { onSuccess: onClose },
    );
  }

  function handleConfirmFee() {
    confirmMatch.mutate(
      { transactionId: txn.id, matchType: "BANK_FEE" },
      { onSuccess: onClose },
    );
  }

  function handleManualJournal() {
    if (!counterAccountId) return;
    confirmMatch.mutate(
      {
        transactionId: txn.id,
        matchType: "MANUAL_JOURNAL",
        counterAccountId: parseInt(counterAccountId, 10),
        memo: memo || undefined,
      },
      {
        onSuccess: () => {
          setJournalDialogOpen(false);
          onClose();
        },
      },
    );
  }

  function handleIgnore() {
    ignoreTransaction.mutate(
      { transactionId: txn.id },
      { onSuccess: onClose },
    );
  }

  function handleUnmatch() {
    unmatch.mutate(
      { transactionId: txn.id },
      { onSuccess: onClose },
    );
  }

  function handleJournalDialogOpen() {
    setJournalDialogOpen(true);
  }

  function handleJournalDialogClose(open: boolean) {
    setJournalDialogOpen(open);
  }

  function handleCounterAccountChange(value: string) {
    setCounterAccountId(value);
  }

  function handleMemoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMemo(e.target.value);
  }

  return (
    <div
      className="flex flex-col h-full"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">
            {txn.txnDate}
          </p>
          <p className="text-sm font-semibold text-foreground line-clamp-2">
            {txn.description}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Money value={amount} className={amount >= 0 ? "text-emerald-600" : "text-red-600"} />
            <BankTxnStatusBadge status={txn.status} size="chip" />
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {suggestions.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Suggested matches</p>
          {suggestions.map((s, i) => {
            const Icon = MATCH_TYPE_ICONS[s.matchedType] ?? DollarSign;
            const confidencePct = parseFloat(s.confidence);
            const matchLabel = s.matchedType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
            return (
              <div
                key={s.id}
                className={[
                  "border rounded-lg p-3 cursor-pointer transition-colors",
                  i === selectedSuggestionIndex
                    ? "border-blue-300 bg-blue-50"
                    : "border-border hover:border-blue-200 hover:bg-muted/30",
                ].join(" ")}
                onClick={() => setSelectedSuggestionIndex(i)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium">{matchLabel}</span>
                  </div>
                  <Money value={parseFloat(s.amount)} />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${confidencePct}%`, transition: "width 0.4s ease" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{confidencePct.toFixed(0)}%</span>
                  <Button
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleConfirmSuggestion(s.id, s.matchedType);
                    }}
                    disabled={confirmMatch.isPending}
                  >
                    Confirm
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-auto space-y-2">
        <p className="text-xs font-medium text-muted-foreground">Manual actions</p>
        <div className="grid grid-cols-2 gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-xs h-8">
                <DollarSign className="h-3.5 w-3.5 mr-1" />
                Bank Fee
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Mark as Bank Fee?</AlertDialogTitle>
                <AlertDialogDescription>
                  This transaction will be categorized as a bank fee and reconciled.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleConfirmFee}>Confirm</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button
            variant="outline"
            size="sm"
            className="text-xs h-8"
            onClick={handleJournalDialogOpen}
          >
            <FileText className="h-3.5 w-3.5 mr-1" />
            Manual Journal
          </Button>

          <LoadingButton
            variant="outline"
            size="sm"
            className="text-xs h-8"
            isPending={ignoreTransaction.isPending}
            loadingText="Ignoring…"
            onClick={handleIgnore}
          >
            Ignore
          </LoadingButton>

          {isReconciled && (
            <LoadingButton
              variant="outline"
              size="sm"
              className="text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50"
              isPending={unmatch.isPending}
              loadingText="Unmatching…"
              onClick={handleUnmatch}
            >
              Unmatch
            </LoadingButton>
          )}
        </div>
      </div>

      <AppDialog
        open={journalDialogOpen}
        onOpenChange={handleJournalDialogClose}
        title="Manual Journal Entry"
        description="Select the counter account to post this transaction against."
        footer={
          <>
            <Button variant="outline" onClick={() => setJournalDialogOpen(false)}>
              Cancel
            </Button>
            <LoadingButton
              isPending={confirmMatch.isPending}
              loadingText="Posting…"
              disabled={!counterAccountId}
              onClick={handleManualJournal}
            >
              Post Journal
            </LoadingButton>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Counter Account *</Label>
            <Select value={counterAccountId} onValueChange={handleCounterAccountChange}>
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {ledgerAccounts.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.code} — {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Memo (optional)</Label>
            <Input
              placeholder="Add a memo…"
              value={memo}
              onChange={handleMemoChange}
              className="h-9 text-sm"
            />
          </div>
        </div>
      </AppDialog>
    </div>
  );
}
