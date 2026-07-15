"use client";

import { PageSection } from "@/components/ui/page-wrapper";
import { usePolicyVersions } from "@/hooks/api/payroll";
import { PayrollStatusBadge, formatMonth } from "@/features/payroll/shared";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import type { VersionRow } from "@/types/payroll/setup";

type VersionHistorySectionProps = {
  policyId: number;
};

const columns: DataTableColumn<VersionRow>[] = [
  {
    key: "version",
    header: "Version",
    className: "font-mono text-xs",
    cell: (row) => `v${row.version}`,
  },
  {
    key: "templateKey",
    header: "Template",
    className: "text-xs text-muted-foreground",
    cell: (row) => row.templateKey,
  },
  {
    key: "effectiveFrom",
    header: "Effective From",
    className: "text-xs",
    cell: (row) => formatMonth(row.effectiveFrom.slice(0, 7)),
  },
  {
    key: "reason",
    header: "Reason",
    className: "text-xs text-muted-foreground truncate max-w-[200px]",
    cell: (row) => row.reason,
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => <PayrollStatusBadge variant="policy" status={row.status} />,
  },
];

export function VersionHistorySection({ policyId }: VersionHistorySectionProps) {
  const { data: versions, isLoading } = usePolicyVersions(policyId);

  if (isLoading) {
    return (
      <PageSection title="Version History">
        <DataTableSkeleton rows={8} columns={5} />
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
      <DataTable
        data={versions}
        columns={columns}
        getRowKey={(row) => row.id}
      />
    </PageSection>
  );
}
