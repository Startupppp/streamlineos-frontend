"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TEXT_ONE_LINE } from "@/lib/text-overflow";
import { cn } from "@/lib/utils";
import type {
  RecallImpact,
  RecallImpactOnHandRow,
  RecallImpactReturnedRow,
  RecallImpactShippedRow,
  RecallImpactTransitRow,
} from "@/hooks/api/inventory/quality";

interface Props {
  impact: RecallImpact;
}

/**
 * D4 — the blast radius, before anybody presses the button.
 *
 * Five figures, and the documents behind each. The ones that matter most are
 * the ones a stock screen cannot show: units already on a lorry, units already
 * with a customer, units already back. A recall decision made from on-hand
 * alone is a decision made from the smallest of the five numbers.
 *
 * Drill-through only where a detail route actually exists — a lot and a sales
 * order have one, a shipment and a transfer do not, so those render as text.
 * A link that predictably ends at a 404 is worse than no link.
 */
export function RecallImpactPanel({ impact }: Props) {
  const lotNumberOf = new Map(impact.lots.map((l) => [l.lotId, l.lotNumber]));
  const lotCell = (lotId: number) => (
    <Link
      href={`/inventory/lots/${lotId}`}
      className="font-medium text-primary transition-colors hover:underline"
    >
      {lotNumberOf.get(lotId) ?? `Lot ${lotId}`}
    </Link>
  );

  const onHandColumns: DataTableColumn<RecallImpactOnHandRow>[] = [
    { key: "lot", header: "Lot", cell: (r) => lotCell(r.lotId) },
    {
      key: "where",
      header: "Where",
      className: "text-muted-foreground",
      cell: (r) => (
        <span className={TEXT_ONE_LINE} title={`${r.warehouseName} · ${r.locationName}`}>
          {r.warehouseName} · {r.locationName}
        </span>
      ),
    },
    {
      key: "onHand",
      header: "On hand",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (r) => r.onHand,
    },
    {
      key: "qualityHold",
      header: "Already held",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums text-muted-foreground",
      cell: (r) => r.qualityHold,
    },
  ];

  const transitColumns: DataTableColumn<RecallImpactTransitRow>[] = [
    { key: "lot", header: "Lot", cell: (r) => lotCell(r.lotId) },
    {
      key: "transfer",
      header: "Transfer",
      className: "text-muted-foreground",
      cell: (r) => r.referenceNumber,
    },
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro">
          {r.status.replace(/_/g, " ").toLowerCase()}
        </Badge>
      ),
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (r) => r.quantity,
    },
  ];

  const shippedColumns: DataTableColumn<RecallImpactShippedRow>[] = [
    { key: "lot", header: "Lot", cell: (r) => lotCell(r.lotId) },
    {
      key: "shipment",
      header: "Shipment",
      className: "text-muted-foreground",
      cell: (r) => r.shipmentNumber,
    },
    {
      key: "order",
      header: "Order",
      cell: (r) =>
        r.salesOrderId !== null ? (
          <Link
            href={`/inventory/sales-orders/${r.salesOrderId}`}
            className="text-primary transition-colors hover:underline"
          >
            {r.salesOrderNumber ?? `Order ${r.salesOrderId}`}
          </Link>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (r) => r.quantity,
    },
  ];

  const returnedColumns: DataTableColumn<RecallImpactReturnedRow>[] = [
    { key: "lot", header: "Lot", cell: (r) => lotCell(r.lotId) },
    {
      key: "return",
      header: "Return",
      className: "text-muted-foreground",
      cell: (r) => r.returnNumber,
    },
    {
      key: "quantity",
      header: "Qty",
      headerClassName: "text-right",
      className: "text-right font-mono tabular-nums",
      cell: (r) => r.quantity,
    },
  ];

  if (impact.totals.lots === 0) {
    return (
      <EmptyState
        className="min-h-0 flex-1 border-0 bg-transparent"
        title="Nothing matches this selection"
        description="No lots answer that question, so there is nothing to recall. Widen the product, window or supplier and simulate again."
      />
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <StatCardGrid cols={5}>
        <StatCard label="Lots" value={impact.totals.lots} tone="amber" />
        <StatCard label="On hand" value={impact.totals.onHand} tone="blue" />
        <StatCard label="In transit" value={impact.totals.inTransit} tone="violet" />
        <StatCard label="Shipped" value={impact.totals.shipped} tone="red" />
        <StatCard label="Returned" value={impact.totals.returned} tone="emerald" />
      </StatCardGrid>

      <ImpactSection
        title="On hand"
        caption="Quarantined and held when you execute."
        emptyText="Nothing on the shelf."
        rows={impact.onHand}
        columns={onHandColumns}
        getRowKey={(r) => `${r.lotId}-${r.locationId}`}
        minWidth="520px"
      />
      <ImpactSection
        title="In transit"
        caption="Already dispatched, not yet received. Executing does not stop a lorry."
        emptyText="Nothing in transit."
        rows={impact.inTransit}
        columns={transitColumns}
        getRowKey={(r) => `${r.lotId}-${r.transferId}`}
        minWidth="520px"
      />
      <ImpactSection
        title="Shipped to customers"
        caption="Who has to be told."
        emptyText="Nothing has shipped."
        rows={impact.shipped}
        columns={shippedColumns}
        getRowKey={(r) => `${r.lotId}-${r.shipmentId}`}
        minWidth="560px"
      />
      <ImpactSection
        title="Already returned"
        caption="Back on the premises, and part of the same batch."
        emptyText="Nothing has come back."
        rows={impact.returned}
        columns={returnedColumns}
        getRowKey={(r) => `${r.lotId}-${r.returnId}`}
        minWidth="440px"
      />

      <p className="text-micro text-muted-foreground">
        Evidence <span className="font-mono">{impact.evidenceVersion}</span> · scope{" "}
        {impact.warehouseScope === "all" ? "all warehouses" : impact.warehouseScope}. Executing
        re-checks this picture and refuses if it has moved.
      </p>
    </div>
  );
}

interface SectionProps<T> {
  title: string;
  caption: string;
  emptyText: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  getRowKey: (row: T) => string;
  minWidth: string;
}

function ImpactSection<T>({
  title,
  caption,
  emptyText,
  rows,
  columns,
  getRowKey,
  minWidth,
}: SectionProps<T>) {
  return (
    <section className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        <Badge variant="outline" className="h-4 px-1.5 py-0 text-micro tabular-nums">
          {rows.length}
        </Badge>
        <p className={cn("text-micro text-muted-foreground", TEXT_ONE_LINE)}>{caption}</p>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {emptyText}
        </p>
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={getRowKey}
          minWidth={minWidth}
          pagination={{ pageSize: 10 }}
        />
      )}
    </section>
  );
}
