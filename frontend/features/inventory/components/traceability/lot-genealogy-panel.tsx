"use client";

import { useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { DataTable, DataTableSkeleton, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { ErrorState, NoPermissionState } from "@/components/shared";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FILTER_SELECT_TRIGGER, FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { statusToneClasses, typeScaleClass } from "@/lib/design-tokens";
import { getErrorMessage } from "@/lib/get-error-message";
import { cn } from "@/lib/utils";
import { useCan } from "@/hooks/api/access";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { GenealogyExportButton } from "./genealogy-export-button";
import {
  useLotGenealogy,
  type GenealogyDirection,
  type GenealogyEdge,
  type GenealogyGraph,
  type GenealogyTruncationReason,
} from "@/hooks/api/inventory/genealogy";

const GENEALOGY_PERMISSION = "inventory:stock:read";

const DIRECTION_LABELS: Readonly<Record<GenealogyDirection, string>> = {
  both: "Both directions",
  backward: "Where it came from",
  forward: "Where it went",
};

const DEPTH_OPTIONS = [2, 4, 6, 8] as const;

/**
 * Why the answer stopped, in the operator's language.
 *
 * A recall trace that says "complete" when a cap cut it short reads the absence
 * of a customer as the goods never having reached one, so every reason the walk
 * stopped is spelled out rather than implied by a shorter list.
 */
const TRUNCATION_LABELS: Readonly<Record<GenealogyTruncationReason, string>> = {
  MAX_DEPTH: "the depth limit was reached — raise it to follow the chain further",
  MAX_NODES: "the node limit was reached — narrow the direction or the depth",
  MAX_EDGES: "the movement limit was reached — narrow the direction or the depth",
  MAX_FANOUT: "some documents touched more items than one view shows",
  WAREHOUSE_SCOPE: "you are assigned to some warehouses, not all of them",
};

interface EdgeRow extends GenealogyEdge {
  fromLabel: string;
  fromKind: string;
  toLabel: string;
  toKind: string;
}

function toRows(graph: GenealogyGraph | undefined): EdgeRow[] {
  if (!graph) return [];
  const byKey = new Map(graph.nodes.map((node) => [node.key, node]));
  return graph.edges.map((edge) => ({
    ...edge,
    fromLabel: byKey.get(edge.from)?.label ?? edge.from,
    fromKind: byKey.get(edge.from)?.kind ?? "",
    toLabel: byKey.get(edge.to)?.label ?? edge.to,
    toKind: byKey.get(edge.to)?.kind ?? "",
  }));
}

const columns: DataTableColumn<EdgeRow>[] = [
  {
    key: "from",
    header: "From",
    className: "font-medium text-foreground",
    cell: (row) => (
      <span>
        {row.fromLabel}
        <span className="ml-1.5 text-muted-foreground">{row.fromKind}</span>
      </span>
    ),
  },
  {
    key: "to",
    header: "To",
    className: "font-medium text-foreground",
    cell: (row) => (
      <span>
        {row.toLabel}
        <span className="ml-1.5 text-muted-foreground">{row.toKind}</span>
      </span>
    ),
  },
  {
    key: "movement",
    header: "Movement",
    className: "text-muted-foreground",
    cell: (row) => row.transactionType ?? (row.kind === "CONTAINS" ? "Contains" : "—"),
  },
  {
    key: "quantity",
    header: "Quantity",
    className: "text-right font-mono tabular-nums",
    headerClassName: "text-right",
    cell: (row) => row.quantity ?? "—",
  },
  {
    key: "when",
    header: "When",
    className: "hidden md:table-cell text-muted-foreground tabular-nums",
    headerClassName: "hidden md:table-cell",
    cell: (row) => (row.occurredAt ? new Date(row.occurredAt).toLocaleString() : "—"),
  },
  {
    key: "flags",
    header: "Notes",
    className: "hidden lg:table-cell",
    headerClassName: "hidden lg:table-cell",
    cell: (row) => {
      if (row.reversed) {
        return (
          <Badge variant="outline" className={statusToneClasses("warning").surface}>
            Reversed
          </Badge>
        );
      }
      if (row.closesCycle) {
        return (
          <Badge variant="outline" className={statusToneClasses("info").surface}>
            Revisit
          </Badge>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
];

interface LotGenealogyPanelProps {
  lotId: number;
}

/**
 * D1 — the genealogy graph for one lot.
 *
 * Rendered as its edge list rather than a canvas: the answer is already capped
 * at 100 nodes by the server, and a node list is only readable while it stays
 * paginated. `DataTable` windows it; nothing here renders an unbounded
 * collection.
 */
export function LotGenealogyPanel({ lotId }: LotGenealogyPanelProps) {
  const canView = useCan(GENEALOGY_PERMISSION);
  const [direction, setDirection] = useState<GenealogyDirection>("both");
  const [maxDepth, setMaxDepth] = useState<number>(4);
  const [includeReversed, setIncludeReversed] = useState(false);

  const { data, isLoading, isError, error, refetch } = useLotGenealogy({
    lotId,
    direction,
    maxDepth,
    includeReversed,
  });

  const rows = useMemo(() => toRows(data), [data]);

  function handleDirectionChange(value: string): void {
    if (value === "forward" || value === "backward" || value === "both") setDirection(value);
  }

  function handleDepthChange(value: string): void {
    setMaxDepth(Number(value));
  }

  function handleReversedChange(value: string): void {
    setIncludeReversed(value === "include");
  }

  function handleRetry(): void {
    void refetch();
  }

  if (!canView) return <NoPermissionState permission={GENEALOGY_PERMISSION} compact />;

  const warning = statusToneClasses("warning");

  return (
    <div className="flex flex-col gap-3">
      <div className={FILTER_TOOLBAR_ROW}>
        <Select value={direction} onValueChange={handleDirectionChange}>
          <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Traversal direction">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {Object.entries(DIRECTION_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={String(maxDepth)} onValueChange={handleDepthChange}>
          <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Depth limit">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            {DEPTH_OPTIONS.map((depth) => (
              <SelectItem key={depth} value={String(depth)}>
                {`Up to ${String(depth)} hops`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={includeReversed ? "include" : "exclude"} onValueChange={handleReversedChange}>
          <SelectTrigger className={FILTER_SELECT_TRIGGER} aria-label="Reversed movements">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
            <SelectItem value="exclude">Exclude reversed movements</SelectItem>
            <SelectItem value="include">Include reversed movements</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <GenealogyExportButton params={{ lotId, direction, maxDepth, includeReversed }} />
        </div>
      </div>

      {data && !data.truncation.complete ? (
        <div
          className={cn(
            "flex items-start gap-2 rounded-md border px-3 py-2",
            warning.surface,
            warning.rule,
            warning.ink,
          )}
          role="status"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div className={cn("flex flex-col gap-0.5", typeScaleClass("dense"))}>
            <span className="font-medium">
              {`This trace is partial — ${String(data.truncation.nodeCount)} of at most ${String(data.caps.maxNodes)} nodes, ${String(data.truncation.depthReached)} hops deep.`}
            </span>
            {data.truncation.reasons.map((reason) => (
              <span key={reason}>{TRUNCATION_LABELS[reason]}</span>
            ))}
            {data.truncation.unexploredNodes > 0 ? (
              <span>
                {`${String(data.truncation.unexploredNodes)} discovered nodes were never followed.`}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      {data?.corrections.excludedFromWalk ? (
        <p className={cn("text-muted-foreground", typeScaleClass("dense"))}>
          Reversed movements and their corrections are left out, so goods that were
          reversed do not read as goods that shipped.
        </p>
      ) : null}

      {isError ? (
        <ErrorState
          title="Couldn't load the genealogy"
          description={getErrorMessage(error)}
          onRetry={handleRetry}
          className="flex-1 min-h-[30dvh]"
        />
      ) : isLoading ? (
        <DataTableSkeleton rows={8} columns={columns.length} />
      ) : (
        <DataTable
          data={rows}
          columns={columns}
          getRowKey={(row, index) => `${row.from}|${row.to}|${String(row.transactionId ?? index)}`}
          minWidth="880px"
          pagination={{ pageSize: 10 }}
          emptyState={
            <InventoryEmptyState
              title="No linked movements"
              description="This lot has no movements that connect it to a document yet."
            />
          }
        />
      )}
    </div>
  );
}
