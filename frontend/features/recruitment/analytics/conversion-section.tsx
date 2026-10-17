"use client";

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageState } from "@/components/shared/page-state";
import { Skeleton } from "@/components/ui/skeleton";
import { usePageState } from "@/hooks/api/use-page-state";
import { useRecruitingAnalytics } from "@/hooks/api/hr/recruitment/recruiting-analytics";

const WINDOW_DAYS = 90;

/** A rate that may legitimately be unknown, rendered as such. */
function Rate({ value }: { value: number | null }) {
  return (
    <span className="font-mono tabular-nums">{value === null ? "—" : `${value}%`}</span>
  );
}

function Figure({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border px-3 py-2.5">
      <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-mono tabular-nums text-foreground">{value}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

/**
 * Conversion over a period, which is a different question from the pipeline
 * chart above it.
 *
 * That one counts candidates by their current status — the shape of the funnel
 * right now, and everybody who already passed through is gone from it. This one
 * counts applications and keeps their terminal status, which is what a
 * conversion rate is actually about. Both are useful and they are not the same
 * number, so they are labelled rather than merged.
 */
export function ConversionSection() {
  const window = useMemo(() => {
    const to = new Date();
    const from = new Date(to.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString() };
  }, []);

  const { data, isLoading, isError, error } = useRecruitingAnalytics(window);

  const pageState = usePageState({
    permission: "hr:requisitions:view",
    isLoading,
    isError,
    error,
  });

  return (
    <PageState resolution={pageState} loading={<Skeleton className="h-64 w-full rounded-xl" />}>
      <div className="space-y-4">
        {data?.empty ? (
          /*
            Said in words rather than drawn as five charts of zero. An empty
            dashboard reads as broken software; "nothing happened in this
            period" reads as a quiet quarter, which is what it is.
          */
          <Card>
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground">
                No applications, interviews or offers in the last {WINDOW_DAYS} days. Conversion
                figures appear once there is something to convert.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-sm">Conversion, last {WINDOW_DAYS} days</CardTitle>
                <Badge variant="outline" className="text-micro">
                  by application
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-muted-foreground text-left">
                        <th className="font-normal pb-2">Stage</th>
                        <th className="font-normal pb-2 text-right">Count</th>
                        <th className="font-normal pb-2 text-right">From previous</th>
                        <th className="font-normal pb-2 text-right">From top</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.funnel ?? []).map((step) => (
                        <tr key={step.stage} className="border-t">
                          <td className="py-2 text-foreground">{step.stage}</td>
                          <td className="py-2 text-right font-mono tabular-nums text-foreground">
                            {step.count}
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            <Rate value={step.conversionFromPrevious} />
                          </td>
                          <td className="py-2 text-right text-muted-foreground">
                            <Rate value={step.conversionFromTop} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Figure
                label="Time to fill (median)"
                value={
                  data?.timeToFillDays.median === null || data === undefined
                    ? "—"
                    : `${data.timeToFillDays.median} days`
                }
                hint={
                  data && data.timeToFillDays.count > 0
                    ? `${data.timeToFillDays.count} filled · p90 ${data.timeToFillDays.p90} days`
                    : "No roles filled in this period"
                }
              />
              <Figure
                label="Offer accept rate"
                value={data?.offers.acceptRate === null ? "—" : `${data?.offers.acceptRate}%`}
                hint={
                  data
                    ? `${data.offers.accepted} accepted · ${data.offers.declined} declined · ${data.offers.outstanding} waiting`
                    : undefined
                }
              />
              <Figure
                label="Interviewers active"
                value={String(data?.interviewerLoad.length ?? 0)}
                hint={
                  data && data.interviewerLoad.length > 0
                    ? `busiest: ${data.interviewerLoad[0]?.name} (${data.interviewerLoad[0]?.scheduled})`
                    : undefined
                }
              />
              <Figure
                label="Sources used"
                value={String(data?.sources.length ?? 0)}
                hint={
                  data && data.sources.length > 0
                    ? `best: ${data.sources[0]?.source} (${data.sources[0]?.hires} hires)`
                    : undefined
                }
              />
            </div>

            {(data?.sources.length ?? 0) > 0 && (
              <Card>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm">Sources</CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-muted-foreground text-left">
                          <th className="font-normal pb-2">Source</th>
                          <th className="font-normal pb-2 text-right">Applicants</th>
                          <th className="font-normal pb-2 text-right">Hires</th>
                          <th className="font-normal pb-2 text-right">Hire rate</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(data?.sources ?? []).map((source) => (
                          <tr key={source.source} className="border-t">
                            <td className="py-2 text-foreground">{source.source}</td>
                            <td className="py-2 text-right font-mono tabular-nums text-foreground">
                              {source.applicants}
                            </td>
                            <td className="py-2 text-right font-mono tabular-nums text-foreground">
                              {source.hires}
                            </td>
                            <td className="py-2 text-right text-muted-foreground">
                              <Rate value={source.hireRate} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PageState>
  );
}
