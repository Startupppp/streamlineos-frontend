import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  RECALL_QUARANTINE_BADGE,
  RECALL_QUARANTINE_EXPLAINER,
  RECALL_QUARANTINE_LABEL,
  isRecallLineUnheld,
  toRecallLineQuarantine,
} from "@/features/inventory/lib";
import { cn } from "@/lib/utils";

interface RecallLine {
  id: number;
  productVariantId?: number | null;
  lotId?: number | null;
  serialId?: number | null;
  status?: string | null;
}

export const RECALL_LINE_COLUMNS: DataTableColumn<RecallLine>[] = [
  {
    key: "lot",
    header: "Lot",
    className: "text-xs",
    cell: (line) =>
      line.lotId ? (
        <Link href={`/inventory/lots/${line.lotId}`} className="text-primary transition-colors hover:underline">
          View lot
        </Link>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "serial",
    header: "Serial",
    className: "text-muted-foreground text-xs",
    cell: (line) => (line.serialId ? `#${line.serialId}` : "—"),
  },
  {
    key: "quarantine",
    header: "Quarantine",
    cell: (line) => {
      const outcome = toRecallLineQuarantine(line.status);
      return (
        <Badge
          variant="outline"
          className={cn("h-5 text-micro px-2 border", RECALL_QUARANTINE_BADGE[outcome])}
          title={RECALL_QUARANTINE_EXPLAINER[outcome]}
        >
          {RECALL_QUARANTINE_LABEL[outcome]}
        </Badge>
      );
    },
  },
];

export function RecallQuarantineSummary({ lines }: { lines: RecallLine[] }) {
  const unheld = lines.filter((line) => isRecallLineUnheld(toRecallLineQuarantine(line.status)));
  if (unheld.length === 0) return null;

  const nothingHeldAtAll = unheld.length === lines.length;
  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-3 py-2 text-xs",
        nothingHeldAtAll ? RECALL_QUARANTINE_BADGE.NOT_QUARANTINABLE : RECALL_QUARANTINE_BADGE.OPEN,
      )}
    >
      <p className="font-medium">
        {nothingHeldAtAll
          ? "No stock is held by this recall"
          : `${unheld.length} of ${lines.length} lines hold no stock`}
      </p>
      <p className="mt-0.5">
        {nothingHeldAtAll
          ? "The recall document was raised but the quarantine held nothing. Check each line below before treating these goods as contained."
          : "The lines marked below were not quarantined. Their goods may still be pickable."}
      </p>
    </div>
  );
}
