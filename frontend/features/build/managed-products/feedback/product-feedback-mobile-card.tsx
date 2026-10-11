"use client";

import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { formatSubmissionAge } from "@/features/build/feedbucket/feedbucket-constants";
import type { SubmissionRow } from "../product-feedback-columns";
import {
  ChannelBadge,
  FrequencyBadge,
  SentimentBadge,
  StatusBadge,
  TypeBadge,
} from "./feedback-signal-badges";

type FeedbackMobileRow = Pick<
  SubmissionRow,
  | "message"
  | "status"
  | "type"
  | "sourceChannel"
  | "sentiment"
  | "duplicateCount"
  | "createdAt"
  | "reporterName"
  | "reporterEmail"
  | "consentStatus"
  | "customer"
  | "segment"
>;

export function ProductFeedbackMobileCard({ row }: { row: FeedbackMobileRow }) {
  const consentDenied = row.consentStatus === "denied";
  const reporterName = consentDenied ? null : row.reporterName;
  const reporterEmail = consentDenied ? null : row.reporterEmail;
  const customerName = row.customer?.name ?? row.segment;

  return (
    <BuildMobileCard
      title={row.message}
      status={<StatusBadge status={row.status} />}
      person={
        reporterName !== null || reporterEmail !== null
          ? {
              user: { name: reporterName, email: reporterEmail },
              role: "From",
            }
          : undefined
      }
      meta={[
        { label: "Age", value: formatSubmissionAge(row.createdAt) },
        ...(customerName ? [{ label: "Customer", value: customerName }] : []),
      ]}
      footer={
        <div className="flex flex-wrap items-center gap-1.5">
          <TypeBadge type={row.type} />
          <ChannelBadge channel={row.sourceChannel} />
          <SentimentBadge sentiment={row.sentiment} />
          <FrequencyBadge duplicateCount={row.duplicateCount} />
        </div>
      }
    />
  );
}
