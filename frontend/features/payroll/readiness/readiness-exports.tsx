"use client";

import { DataTable } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { EXPORT_COLUMNS, type ReadinessExport } from "./readiness-columns";

const EXPORT_PAGE_SIZE = 25;

interface ReadinessExportsProps {
  exports: readonly ReadinessExport[];
}

function exportRowKey(row: ReadinessExport): number {
  return row.id;
}

export function ReadinessExports({ exports }: ReadinessExportsProps) {
  return (
    <section className="rounded-xl border border-border bg-card p-4 space-y-3" aria-label="Payroll exports">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Export evidence</h3>
        <span className="text-dense tabular-nums text-muted-foreground">{exports.length}</span>
      </div>
      {exports.length === 0 ? (
        <EmptyState
          compact
          title="No exports yet"
          description="No approved hours have been exported for this month yet."
        />
      ) : (
        <DataTable
          data={exports as ReadinessExport[]}
          columns={EXPORT_COLUMNS}
          getRowKey={exportRowKey}
          pagination={{ pageSize: EXPORT_PAGE_SIZE }}
          scrollRegionLabel="Payroll exports"
        />
      )}
    </section>
  );
}
