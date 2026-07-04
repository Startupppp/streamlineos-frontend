"use client";

import { PageSection } from "@/components/ui/page-wrapper";
import { usePolicyVersions } from "@/hooks/api/payroll";
import { PayrollStatusBadge, formatMonth } from "@/features/payroll/shared";
import type { VersionRow } from "@/types/payroll/setup";

type VersionHistorySectionProps = {
  policyId: number;
};

const TABLE_HEADERS = ["Version", "Template", "Effective From", "Reason", "Status"];

export function VersionHistorySection({ policyId }: VersionHistorySectionProps) {
  const { data: versions, isLoading } = usePolicyVersions(policyId);

  if (isLoading) {
    return (
      <PageSection title="Version History">
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </PageSection>
    );
  }

  if (!versions?.length) {
    return (
      <PageSection title="Version History">
        <p className="text-sm text-muted-foreground">No version history yet.</p>
      </PageSection>
    );
  }

  return (
    <PageSection
      title="Version History"
      description="History of policy changes and activations"
    >
      <div className="rounded-lg border border-border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b border-border">
            <tr>
              {TABLE_HEADERS.map((h) => (
                <th
                  key={h}
                  className="px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {versions.map((v: VersionRow, i: number) => (
              <tr key={v.id} className={i > 0 ? "border-t border-border" : ""}>
                <td className="px-3 py-2.5 font-mono text-xs">v{v.version}</td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground">{v.templateKey}</td>
                <td className="px-3 py-2.5 text-xs">
                  {formatMonth(v.effectiveFrom.slice(0, 7))}
                </td>
                <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]">
                  {v.reason}
                </td>
                <td className="px-3 py-2.5">
                  <PayrollStatusBadge variant="policy" status={v.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PageSection>
  );
}
