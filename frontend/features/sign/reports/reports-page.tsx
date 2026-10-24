"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { CheckCircle2, XCircle, Clock, ShieldAlert } from "lucide-react";
import type { SignSummaryStats } from "@/hooks/api/sign/reports";
import { ENVELOPE_STATUS_LABEL } from "../lib/status";
import type { SignEnvelopeStatus } from "@/types/sign";

function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function isEnvelopeStatus(status: string): status is SignEnvelopeStatus {
  return Object.hasOwn(ENVELOPE_STATUS_LABEL, status);
}

function envelopeStatusLabel(status: string): string {
  return isEnvelopeStatus(status) ? ENVELOPE_STATUS_LABEL[status] : status;
}

function senderRowKey(sender: SignSummaryStats["senderPerformance"][number]): string {
  return `${sender.senderMembershipId ?? "none"}:${sender.senderName ?? "unknown"}:${sender.sentCount}`;
}

export function SignReportsSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-4 w-16" />
      <StatCardGridSkeleton cols={4} count={4} />
      <div className="grid gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function SignReportsPanels({ data }: { data: SignSummaryStats }) {
  const averageTime =
    data.avgTimeToSignHours !== null ? `${data.avgTimeToSignHours.toFixed(1)}h` : "—";

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-sm font-semibold">Reports</h2>
      <StatCardGrid cols={4}>
        <StatCard
          label="Completion rate"
          value={formatPercent(data.completionRate)}
          icon={CheckCircle2}
          tone="emerald"
        />
        <StatCard
          label="Decline rate"
          value={formatPercent(data.declineRate)}
          icon={XCircle}
          tone="red"
        />
        <StatCard label="Avg. time to sign" value={averageTime} icon={Clock} tone="blue" />
        <StatCard label="Auth failures" value={data.authFailures} icon={ShieldAlert} tone="amber" />
      </StatCardGrid>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Envelopes by status</CardTitle>
          </CardHeader>
          <CardContent>
            {Object.keys(data.byStatus).length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No envelopes yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {Object.entries(data.byStatus).map(([status, count]) => (
                  <li key={status} className="flex items-center justify-between text-sm">
                    <span>{envelopeStatusLabel(status)}</span>
                    <span className="font-medium tabular-nums">{count}</span>
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
              <p className="py-4 text-center text-sm text-muted-foreground">No data yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.senderPerformance.map((sender) => (
                  <li key={senderRowKey(sender)} className="flex items-center justify-between text-sm">
                    <span>{sender.senderName ?? "Unknown"}</span>
                    <span className="font-medium tabular-nums">{sender.sentCount} sent</span>
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
              <p className="py-4 text-center text-sm text-muted-foreground">No templates used yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {data.templateUsage.map((template) => (
                  <li
                    key={template.templateId ?? template.templateName}
                    className="flex items-center justify-between text-sm"
                  >
                    <span>{template.templateName}</span>
                    <span className="font-medium tabular-nums">{template.value} envelopes</span>
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
          <CardContent className="flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <span>Bulk send jobs</span>
              <span className="font-medium tabular-nums">{data.bulkSendStats?.totalJobs ?? 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Bulk send rows sent / failed</span>
              <span className="font-medium tabular-nums">
                {data.bulkSendStats?.successRows ?? 0} / {data.bulkSendStats?.failedRows ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Watermarked completions</span>
              <span className="font-medium tabular-nums">{data.watermarkUsageCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
