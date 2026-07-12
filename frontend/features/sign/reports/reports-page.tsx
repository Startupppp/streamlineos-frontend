"use client";

import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { MetricCard } from "@/components/charts/metric-card";
import { CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import { useSignSummary } from "@/hooks/api/sign/reports";
import { ENVELOPE_STATUS_LABEL } from "../lib/status";
import type { SignEnvelopeStatus } from "@/types/sign";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function ReportsPage() {
  const { data, isLoading, isError, refetch } = useSignSummary();

  if (isLoading || !data) {
    return (
      <PageWrapper title="Reports" subtitle="Envelope activity, completion rates, and usage across SignOS">
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </PageWrapper>
    );
  }

  if (isError) {
    return (
      <PageWrapper title="Reports" subtitle="Envelope activity, completion rates, and usage across SignOS">
        <ErrorState title="Failed to load reports" onRetry={() => void refetch()} />
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Reports" subtitle="Envelope activity, completion rates, and usage across SignOS">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Completion rate" value={formatPercent(data.completionRate)} icon={CheckCircle2} />
          <MetricCard label="Decline rate" value={formatPercent(data.declineRate)} icon={XCircle} />
          <MetricCard
            label="Avg. time to sign"
            value={data.avgTimeToSignHours !== null ? `${data.avgTimeToSignHours.toFixed(1)}h` : "—"}
            icon={Clock}
          />
          <MetricCard label="Auth failures" value={data.authFailures} icon={ShieldAlert} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Envelopes by status</CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(data.byStatus).length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No envelopes yet.</p>
              ) : (
                <ul className="space-y-2">
                  {Object.entries(data.byStatus).map(([status, count]) => (
                    <li key={status} className="flex items-center justify-between text-sm">
                      <span>{ENVELOPE_STATUS_LABEL[status as SignEnvelopeStatus] ?? status}</span>
                      <span className="font-medium">{count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Sender performance</CardTitle>
            </CardHeader>
            <CardContent>
              {data.senderPerformance.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.senderPerformance.map((s) => (
                    <li key={s.senderUserId} className="flex items-center justify-between text-sm">
                      <span>{s.senderName ?? "Unknown"}</span>
                      <span className="font-medium">{s.sentCount} sent</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Template usage</CardTitle>
            </CardHeader>
            <CardContent>
              {data.templateUsage.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No templates used yet.</p>
              ) : (
                <ul className="space-y-2">
                  {data.templateUsage.map((t) => (
                    <li key={t.templateId} className="flex items-center justify-between text-sm">
                      <span>{t.templateName}</span>
                      <span className="font-medium">{t.value} envelopes</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Bulk send &amp; watermark usage</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span>Bulk send jobs</span>
                <span className="font-medium">{data.bulkSendStats.totalJobs}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Bulk send rows sent / failed</span>
                <span className="font-medium">
                  {data.bulkSendStats.successRows} / {data.bulkSendStats.failedRows}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Watermarked completions</span>
                <span className="font-medium">{data.watermarkUsageCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageWrapper>
  );
}
