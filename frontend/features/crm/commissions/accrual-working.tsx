"use client";

import { Fragment, useState, useCallback } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type {
  CommissionAccrual,
  CommissionDealContribution,
  CommissionRuleContribution,
} from "@/types/crm/commission";
import { formatMinor } from "@/lib/pricing-format";
import {
  formatBps,
  formatEarnedOn,
  formatMultiplier,
  formatTierFrom,
} from "./commission-format";

interface AccrualWorkingProps {
  accrual: CommissionAccrual;
  locale: string;
}

/**
 * The working: every deal that contributed, and the bands that priced it.
 *
 * This is the answer to "why is my number this?", which is the question every
 * commission dispute opens with. Each row is a figure the server sent, never one
 * computed here — expanding a deal shows the same band rows the total was summed
 * from, so a rep can check the arithmetic by reading rather than by trusting.
 */
export function AccrualWorking({ accrual, locale }: AccrualWorkingProps) {
  const [openDeal, setOpenDeal] = useState<string | null>(null);
  const quotaBased = accrual.attainmentBps !== null;

  const toggle = useCallback(
    (earningId: string) => setOpenDeal((current) => (current === earningId ? null : earningId)),
    [],
  );

  if (accrual.deals.length === 0)
    return (
      <EmptyState
        compact
        title="Nothing has accrued in this period yet"
        description="A deal contributes here when it is closed-won and its earning has been calculated."
      />
    );

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold">By deal</h3>
          <p className="text-sm text-muted-foreground">
            Open a row to see the bands that priced it.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="w-8" />
                <TableHead>Deal</TableHead>
                <TableHead>Earned</TableHead>
                <TableHead className="text-right">Basis</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accrual.deals.map((deal) => (
                <DealRows
                  key={deal.earningId}
                  deal={deal}
                  currency={accrual.currency}
                  locale={locale}
                  quotaBased={quotaBased}
                  open={openDeal === deal.earningId}
                  onToggle={toggle}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-sm font-semibold">By rule</h3>
          <p className="text-sm text-muted-foreground">
            The same money, rolled up to the band that produced it.
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead>Band from</TableHead>
                <TableHead className="text-right">Rate</TableHead>
                <TableHead className="text-right">Multiplier</TableHead>
                <TableHead className="text-right">Basis</TableHead>
                <TableHead className="text-right">Commission</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accrual.rules.map((rule) => (
                <TableRow key={`${rule.tierIndex}-${rule.rateBps}-${rule.multiplierBps}`}>
                  <TableCell>
                    {formatTierFrom(rule.tierFrom, accrual.currency, locale, quotaBased)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatBps(rule.rateBps)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMultiplier(rule.multiplierBps)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatMinor(rule.basisMinor, accrual.currency, locale)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMinor(rule.amountMinor, accrual.currency, locale)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}

interface DealRowsProps {
  deal: CommissionDealContribution;
  currency: string;
  locale: string;
  quotaBased: boolean;
  open: boolean;
  onToggle: (earningId: string) => void;
}

function DealRows({ deal, currency, locale, quotaBased, open, onToggle }: DealRowsProps) {
  return (
    <Fragment>
      <TableRow
        className="cursor-pointer"
        onClick={() => onToggle(deal.earningId)}
        aria-expanded={open}
      >
        <TableCell>
          {open ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
          <span className="sr-only">
            {open ? "Hide" : "Show"} the bands for {deal.dealName ?? deal.sourceId}
          </span>
        </TableCell>
        <TableCell className="font-medium">
          {deal.dealName ?? `${deal.sourceType} ${deal.sourceId}`}
        </TableCell>
        <TableCell className="text-muted-foreground">
          {formatEarnedOn(deal.earnedOn, locale)}
        </TableCell>
        <TableCell className="text-right tabular-nums">
          {formatMinor(deal.basisMinor, currency, locale)}
        </TableCell>
        <TableCell className="text-right font-medium tabular-nums">
          {formatMinor(deal.amountMinor, currency, locale)}
        </TableCell>
      </TableRow>

      {open
        ? deal.rules.map((rule, index) => (
            <BandRow
              key={`${deal.earningId}-${rule.tierIndex}-${index}`}
              rule={rule}
              currency={currency}
              locale={locale}
              quotaBased={quotaBased}
            />
          ))
        : null}
    </Fragment>
  );
}

function BandRow({
  rule,
  currency,
  locale,
  quotaBased,
}: {
  rule: CommissionRuleContribution;
  currency: string;
  locale: string;
  quotaBased: boolean;
}) {
  return (
    <TableRow className="bg-muted/40">
      <TableCell />
      <TableCell className={cn("text-sm text-muted-foreground")} colSpan={2}>
        {`Band from ${formatTierFrom(rule.tierFrom, currency, locale, quotaBased)} at ${formatBps(rule.rateBps)}`}
        {rule.multiplierBps === 10_000 ? "" : ` × ${formatMultiplier(rule.multiplierBps)}`}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
        {formatMinor(rule.basisMinor, currency, locale)}
      </TableCell>
      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">
        {formatMinor(rule.amountMinor, currency, locale)}
      </TableCell>
    </TableRow>
  );
}
