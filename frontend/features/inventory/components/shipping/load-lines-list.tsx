"use client";

import { useShipments } from "@/hooks/api/inventory/shipping";
import { useTransfers } from "@/hooks/api/inventory/transfers";
import type { LoadLine } from "@/hooks/api/inventory/shipping-loads-schema";

interface LoadLinesListProps {
  lines: LoadLine[];
}

interface LoadLineRowProps {
  kind: string;
  reference: string;
}

function LoadLineRow({ kind, reference }: LoadLineRowProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-xs text-muted-foreground">{kind}</span>
      <span className="text-sm font-mono">{reference}</span>
    </div>
  );
}

export function LoadLinesList({ lines }: LoadLinesListProps) {
  const shipmentsQuery = useShipments({ limit: 100 });
  const transfersQuery = useTransfers({ limit: 100 });

  const shipmentNumbers = new Map(
    (shipmentsQuery.data?.items ?? []).map((shipment) => [shipment.id, shipment.shipmentNumber]),
  );
  const transferNumbers = new Map(
    (transfersQuery.data?.items ?? []).map((transfer) => [transfer.id, transfer.referenceNumber]),
  );

  if (lines.length === 0)
    return <p className="text-xs text-muted-foreground">No shipments or transfers on this load</p>;

  return (
    <div className="divide-y divide-border rounded-lg border">
      {lines.map((line) => (
        <LoadLineRow
          key={line.id}
          kind={line.shipmentId !== null ? "Shipment" : "Transfer"}
          reference={
            line.shipmentId !== null
              ? (shipmentNumbers.get(line.shipmentId) ?? "—")
              : line.transferId !== null
                ? (transferNumbers.get(line.transferId) ?? "—")
                : "—"
          }
        />
      ))}
    </div>
  );
}
