"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { useAttributionByModel } from "@/hooks/api/crm/campaigns";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMinorMoney } from "@/lib/accounting/money";
import { ATTRIBUTION_MODELS, type AttributionModel } from "@/types/crm/campaigns";

/**
 * CRM-P1-01. Won revenue read under whichever attribution model you choose.
 *
 * The backend has implemented five models for a while and the only reports on
 * screen were first-touch and last-touch — which is to say, the two that make
 * the strongest claim about which single touch mattered, and the ones the
 * multi-touch work existed to stop being the only answer.
 *
 * The label under each model comes from the response, not from a copy here.
 * The backend owns what a model claims, and a second wording would drift from
 * the arithmetic it describes.
 */

const MODEL_LABEL: Record<AttributionModel, string> = {
  first_touch: "First touch",
  last_touch: "Last touch",
  linear: "Linear",
  time_decay: "Time decay",
  position_based: "Position based",
};

const HALF_LIFE_CHOICES = [7, 14, 30, 90] as const;

export function AttributionByModel() {
  /** Linear by default, matching the server: the model with no parameter to get wrong. */
  const [model, setModel] = useState<AttributionModel>("linear");
  const [halfLifeDays, setHalfLifeDays] = useState<number>(30);

  const display = useOrgDisplay();
  const report = useAttributionByModel(model, halfLifeDays);
  const money = (minor: number) => formatMinorMoney(minor, display.currency);

  function handleModelChange(value: string) {
    const next = ATTRIBUTION_MODELS.find((candidate) => candidate === value);
    if (next) setModel(next);
  }

  function handleHalfLifeChange(value: string) {
    setHalfLifeDays(Number(value));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attribution by model</CardTitle>
        <CardDescription>
          {report.data?.modelDescription ??
            "The same won revenue, divided across touches a different way."}
        </CardDescription>

        <div className="mt-3 flex flex-wrap items-center gap-gap-field">
          <Select value={model} onValueChange={handleModelChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ATTRIBUTION_MODELS.map((m) => (
                <SelectItem key={m} value={m}>
                  {MODEL_LABEL[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Only time_decay reads it, so offering it elsewhere would imply it matters. */}
          {model === "time_decay" ? (
            <Select value={String(halfLifeDays)} onValueChange={handleHalfLifeChange}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HALF_LIFE_CHOICES.map((days) => (
                  <SelectItem key={days} value={String(days)}>
                    {days}-day half-life
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </CardHeader>

      <CardContent>
        {report.isPending ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : report.isError ? (
          <ErrorState
            title="Could not work out attribution"
            onRetry={() => void report.refetch()}
          />
        ) : !report.data ? null : (
          <div className="space-y-gap-section">
            {/*
              The honest totals, first and unavoidable. The backend goes to some
              trouble to say how much revenue it could NOT attribute and how many
              won deals had no touches at all; a page showing only the campaign
              rows would quietly present a partial picture as the whole one.
            */}
            <dl className="grid grid-cols-2 gap-gap-field sm:grid-cols-4">
              <div>
                <dt className="text-micro text-muted-foreground">Won revenue</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {money(report.data.totalRevenueMinor)}
                </dd>
              </div>
              <div>
                <dt className="text-micro text-muted-foreground">Attributed</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {money(report.data.attributedRevenueMinor)}
                </dd>
              </div>
              <div>
                <dt className="text-micro text-muted-foreground">Could not attribute</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {money(report.data.unattributableRevenueMinor)}
                </dd>
              </div>
              <div>
                <dt className="text-micro text-muted-foreground">Won deals with no touches</dt>
                <dd className="text-sm font-medium tabular-nums">
                  {report.data.dealsWithoutTouches} of {report.data.dealsConsidered}
                </dd>
              </div>
            </dl>

            {report.data.truncated ? (
              <p role="status" className="text-label text-status-warning-ink">
                More won deals than this report reads in one pass. These numbers are a
                floor, not a total.
              </p>
            ) : null}

            <div className="overflow-x-auto">
              <Table className="min-w-[560px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Campaign</TableHead>
                    <TableHead className="text-right">Touches</TableHead>
                    <TableHead className="text-right">Deals</TableHead>
                    <TableHead className="text-right">Attributed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.data.campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="p-0">
                        <EmptyState
                          compact
                          title="Nothing to attribute yet"
                          description="No touches on any won deal in this window."
                          className="border-0 bg-transparent"
                        />
                      </TableCell>
                    </TableRow>
                  ) : (
                    report.data.campaigns.map((campaign) => (
                      <TableRow key={campaign.campaignId ?? "none"}>
                        <TableCell>
                          <span className="mr-2">{campaign.campaignName}</span>
                          {/*
                            An archived campaign still holding credit is shown
                            rather than dropped: removing the row would move its
                            revenue into "could not attribute" and understate a
                            campaign that really did the work.
                          */}
                          {campaign.campaignArchived ? (
                            <Badge variant="outline">archived</Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {campaign.touchCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {campaign.dealCount}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(campaign.attributedRevenueMinor)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
