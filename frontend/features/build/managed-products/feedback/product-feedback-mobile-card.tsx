"use client";

import { Badge } from "@/components/ui/badge";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import {
  STATUS_LABELS,
  STATUS_VARIANTS,
  TYPE_LABELS,
  TYPE_VARIANTS,
  formatSubmissionAge,
} from "@/features/build/feedbucket/feedbucket-constants";
import type { SubmissionRow } from "../product-feedback-columns";

export function ProductFeedbackMobileCard({ row }: { row: SubmissionRow }) {
  return (
    <BuildMobileCard
      title={row.message}
      status={
        <Badge variant={STATUS_VARIANTS[row.status]} className="text-xs">
          {STATUS_LABELS[row.status]}
        </Badge>
      }
      person={
        row.reporterName !== null || row.reporterEmail !== null
          ? {
              user: { name: row.reporterName, email: row.reporterEmail },
              role: "From",
            }
          : undefined
      }
      meta={[
        {
          label: "Type",
          value: (
            <Badge variant={TYPE_VARIANTS[row.type]} className="text-xs">
              {TYPE_LABELS[row.type]}
            </Badge>
          ),
        },
        { label: "Age", value: formatSubmissionAge(row.createdAt) },
      ]}
    />
  );
}
