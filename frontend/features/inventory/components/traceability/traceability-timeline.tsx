"use client";

import { memo, type ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import type {
  TraceabilityResult,
  TraceabilityNode,
  TraceabilityEdge,
} from "@/hooks/api/inventory/traceability";

interface TraceabilityTimelineProps {
  result: TraceabilityResult | undefined;
  isLoading: boolean;
}

interface TimelineSectionProps {
  dotClass: string;
  label: string;
  children: ReactNode;
}

function TimelineSection({ dotClass, label, children }: TimelineSectionProps) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`h-3 w-3 rounded-full shrink-0 mt-0.5 ${dotClass}`} />
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="pb-5 min-w-0 flex-1">
        <p className="text-dense font-semibold text-foreground uppercase tracking-wider mb-1.5">
          {label}
        </p>
        {children}
      </div>
    </div>
  );
}

const NodeRow = memo(function NodeRow({ node }: { node: TraceabilityNode }) {
  return (
    <div className="flex items-start justify-between gap-2 text-dense py-0.5">
      <div className="min-w-0 flex-1">
        <span className="font-medium text-foreground">{node.label}</span>
        <span className="text-muted-foreground ml-1.5 font-mono text-[10px]">
          {node.id}
        </span>
      </div>
      <span className="text-muted-foreground text-[10px] uppercase tracking-wider shrink-0">
        {node.type}
      </span>
    </div>
  );
});

const EdgeRow = memo(function EdgeRow({ edge }: { edge: TraceabilityEdge }) {
  return (
    <div className="flex items-center gap-2 text-dense py-0.5 text-muted-foreground">
      <span className="font-mono text-[10px] shrink-0 truncate max-w-[6rem]">
        {edge.fromId}
      </span>
      <span className="text-[10px]">→</span>
      <span className="font-mono text-[10px] shrink-0 truncate max-w-[6rem]">
        {edge.toId}
      </span>
      <span className="ml-auto text-[10px] uppercase tracking-wider shrink-0">
        {edge.relationship}
      </span>
    </div>
  );
});

function groupNodesByType(nodes: TraceabilityNode[]): Map<string, TraceabilityNode[]> {
  const map = new Map<string, TraceabilityNode[]>();
  for (const node of nodes) {
    const group = map.get(node.type) ?? [];
    group.push(node);
    map.set(node.type, group);
  }
  return map;
}

const NODE_TYPE_DOT: Record<string, string> = {
  LOT: "bg-primary",
  SERIAL: "bg-primary",
  RECEIPT: "bg-status-success-fill",
  SHIPMENT: "bg-status-warning-fill",
  RETURN: "bg-status-warning-fill",
  ADJUSTMENT: "bg-muted-foreground/40",
};

function getDotClass(type: string): string {
  return NODE_TYPE_DOT[type] ?? "bg-primary/60";
}

export function TraceabilityTimeline({
  result,
  isLoading,
}: TraceabilityTimelineProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-3 w-3 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!result || result.nodes.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        No traceability data available.
      </p>
    );
  }

  const grouped = groupNodesByType(result.nodes);

  return (
    <div className="space-y-0 pl-1">
      {Array.from(grouped.entries()).map(([type, nodes]) => (
        <TimelineSection key={type} dotClass={getDotClass(type)} label={type}>
          <div className="space-y-0.5">
            {nodes.map((node) => (
              <NodeRow key={node.id} node={node} />
            ))}
          </div>
        </TimelineSection>
      ))}
      {result.edges.length > 0 && (
        <TimelineSection dotClass="bg-muted-foreground/40" label="Relationships">
          <div className="space-y-0.5">
            {result.edges.map((edge) => (
              <EdgeRow
                key={`${edge.fromId}__${edge.toId}__${edge.relationship}`}
                edge={edge}
              />
            ))}
          </div>
        </TimelineSection>
      )}
    </div>
  );
}
