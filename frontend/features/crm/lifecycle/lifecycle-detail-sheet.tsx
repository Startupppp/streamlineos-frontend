"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared/app-sheet";
import { ErrorState } from "@/components/shared/error-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCan } from "@/hooks/api/access";
import {
  useConsiderLifecycleTrigger,
  useCustomerLifecycle,
} from "@/hooks/api/crm/lifecycle";
import { getErrorMessage } from "@/lib/get-error-message";
import { LifecycleActionDialog, type LifecycleAction } from "./lifecycle-action-dialogs";
import { SIGNAL_KIND_LABEL, SIGNAL_KINDS } from "./lifecycle-action-schema";
import {
  RISK_LABEL,
  RISK_TONE,
  STATUS_LABEL,
  describeSweepEntry,
  formatDate,
  formatMinor,
} from "./lifecycle-format";

interface LifecycleDetailSheetProps {
  customerLifecycleId: string | null;
  partyName: string | null;
  currency: string;
  locale: string;
  onOpenChange: (open: boolean) => void;
}

function signalLabel(kind: string): string {
  const known = SIGNAL_KINDS.find((candidate) => candidate === kind);
  return known ? SIGNAL_KIND_LABEL[known] : kind;
}

/**
 * One contract, its signal history, and the writes a renewals manager makes.
 *
 * Each control gates on its own key: `crm:lifecycle:manage` for signal, renew
 * and close; `crm:lifecycle-triggers:run` for "consider now", which can open an
 * opportunity and spend AI credits.
 */
export function LifecycleDetailSheet({
  customerLifecycleId,
  partyName,
  currency,
  locale,
  onOpenChange,
}: LifecycleDetailSheetProps) {
  const lifecycle = useCustomerLifecycle(customerLifecycleId);
  const consider = useConsiderLifecycleTrigger();
  const canManage = useCan("crm:lifecycle:manage");
  const canRun = useCan("crm:lifecycle-triggers:run");
  const [action, setAction] = useState<LifecycleAction | null>(null);

  const row = lifecycle.data;
  const isActive = row?.status === "active";

  const handleActionOpenChange = useCallback((open: boolean) => {
    if (!open) setAction(null);
  }, []);
  const handleSignal = useCallback(() => setAction("signal"), []);
  const handleRenew = useCallback(() => setAction("renew"), []);
  const handleClose = useCallback(() => setAction("close"), []);
  const handleRetry = useCallback(() => void lifecycle.refetch(), [lifecycle]);
  const handleConsider = useCallback(() => {
    if (!customerLifecycleId) return;
    consider.mutate(customerLifecycleId, {
      onSuccess: (entry) => toast.success(describeSweepEntry(entry)),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }, [consider, customerLifecycleId]);

  return (
    <AppSheet
      open={customerLifecycleId !== null}
      onOpenChange={onOpenChange}
      title={partyName ?? "Contract"}
      description="The term, its value, and the evidence behind its risk score."
      footer={
        row && isActive && (canManage || canRun) ? (
          <div className="flex flex-wrap justify-end gap-2">
            {canRun ? (
              <LoadingButton variant="outline" isPending={consider.isPending} onClick={handleConsider}>
                Consider now
              </LoadingButton>
            ) : null}
            {canManage ? (
              <>
                <Button type="button" variant="outline" onClick={handleSignal}>
                  Record signal
                </Button>
                <Button type="button" variant="outline" onClick={handleClose}>
                  Close
                </Button>
                <Button type="button" onClick={handleRenew}>
                  Renew
                </Button>
              </>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {lifecycle.isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : lifecycle.error ? (
        <ErrorState
          title="Couldn't load this contract"
          error={lifecycle.error}
          onRetry={handleRetry}
        />
      ) : row ? (
        <div className="flex flex-col gap-6">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <Fact label="Status">{STATUS_LABEL[row.status]}</Fact>
            <Fact label="Risk">
              <Badge variant="secondary" className={RISK_TONE[row.band]}>
                {`${RISK_LABEL[row.band]} · ${row.riskScore}`}
              </Badge>
            </Fact>
            <Fact label="Renewal">{formatDate(row.renewalOn, locale)}</Fact>
            <Fact label="Value">
              <span className="tabular-nums">{formatMinor(row.contractValueMinor, currency, locale)}</span>
            </Fact>
            <Fact label="Term">{`${row.termMonths} mo · started ${formatDate(row.startedOn, locale)}`}</Fact>
            <Fact label="Renewals">
              <span className="tabular-nums">{row.renewalCount}</span>
            </Fact>
            {row.closedReason ? <Fact label="Closed because">{row.closedReason}</Fact> : null}
            <Fact label="Source deal">
              <Link className="underline underline-offset-2" href={`/crm/deals/${row.sourceDealId}`}>
                Open deal
              </Link>
            </Fact>
          </dl>

          <section className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Signals</h3>
            {row.signals.length === 0 ? (
              <EmptyState compact title="No signals yet" description="Nothing has moved this score." />
            ) : (
              <ul className="flex flex-col gap-2">
                {row.signals.map((signal) => (
                  <li
                    key={signal.lifecycleSignalId}
                    className="rounded-xl border border-border bg-surface-inset p-3 text-sm dark:border-background"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{signalLabel(signal.kind)}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {signal.impact > 0 ? `+${signal.impact}` : signal.impact}
                      </span>
                    </div>
                    <div className="text-muted-foreground">
                      {`${formatDate(signal.observedAt, locale)} · ${signal.source === "human" ? "Recorded" : "Observed"}`}
                    </div>
                    {signal.note ? <p className="mt-1">{signal.note}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {customerLifecycleId ? (
        <LifecycleActionDialog
          action={action}
          customerLifecycleId={customerLifecycleId}
          currency={currency}
          onOpenChange={handleActionOpenChange}
        />
      ) : null}
    </AppSheet>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}
