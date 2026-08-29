"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCan } from "@/hooks/api/access";
import { useApproveCommissionEarning } from "@/hooks/api/crm/commission";
import { getErrorMessage } from "@/lib/get-error-message";
import type {
  CommissionEarning,
  CommissionEarningStatus,
} from "@/types/crm/commission";
import { formatBps, formatCommissionMoney, formatEarnedOn } from "./commission-format";

/**
 * The earnings ledger, and the one write a manager makes against it.
 *
 * Approval is a separate authority from defining a plan, so that the person who
 * wrote the rate cannot also sign off their own number. The button is absent
 * without `crm:commission-earnings:approve` rather than present-and-failing —
 * and an earning that is not `CALCULATED` has no button at all, because the
 * server refuses those with a 409 and offering the action would be a lie.
 */

const STATUS_TONE: Record<CommissionEarningStatus, string> = {
  CALCULATED: "bg-status-warning-surface text-status-warning-ink",
  APPROVED: "bg-status-success-surface text-status-success-ink",
  PAID: "bg-status-info-surface text-status-info-ink",
  VOID: "bg-status-danger-surface text-status-danger-ink",
};

const STATUS_LABEL: Record<CommissionEarningStatus, string> = {
  CALCULATED: "Awaiting approval",
  APPROVED: "Approved",
  PAID: "Paid",
  VOID: "Void",
};

interface EarningsLedgerProps {
  earnings: CommissionEarning[];
  locale: string;
}

export function EarningsLedger({ earnings, locale }: EarningsLedgerProps) {
  const canApprove = useCan("crm:commission-earnings:approve");
  const approve = useApproveCommissionEarning();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const handleApprove = useCallback(
    (earningId: string) => {
      setPendingId(earningId);
      approve.mutate(earningId, {
        onSuccess: () => {
          toast.success("Earning approved");
          setPendingId(null);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error));
          setPendingId(null);
        },
      });
    },
    [approve],
  );

  if (earnings.length === 0)
    return (
      <p className="px-1 py-8 text-center text-sm text-muted-foreground">
        No earnings match this filter.
      </p>
    );

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead>Earned</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Basis</TableHead>
            <TableHead className="text-right">Rate</TableHead>
            <TableHead className="text-right">Commission</TableHead>
            <TableHead>Status</TableHead>
            {canApprove ? <TableHead className="w-28" /> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {earnings.map((earning) => (
            <TableRow key={earning.earningId}>
              <TableCell className="text-muted-foreground">
                {formatEarnedOn(earning.earnedOn, locale)}
              </TableCell>
              <TableCell className="font-medium">
                {`${earning.sourceType} ${earning.sourceId}`}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatCommissionMoney(earning.basisMinor, earning.currency, locale)}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatBps(earning.effectiveRateBps)}
              </TableCell>
              <TableCell className="text-right font-medium tabular-nums">
                {formatCommissionMoney(earning.amountMinor, earning.currency, locale)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className={STATUS_TONE[earning.status]}>
                  {STATUS_LABEL[earning.status]}
                </Badge>
              </TableCell>
              {canApprove ? (
                <TableCell>
                  {earning.status === "CALCULATED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={pendingId === earning.earningId}
                      onClick={() => handleApprove(earning.earningId)}
                    >
                      {pendingId === earning.earningId ? "Approving…" : "Approve"}
                    </Button>
                  ) : null}
                </TableCell>
              ) : null}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
