"use client";

import { memo } from "react";
import type { useCriticalPath } from "@/hooks/api/build/reports";
import type { BarGeometry } from "./gantt-geometry";

type CP = NonNullable<ReturnType<typeof useCriticalPath>["data"]>;
type CPNode = CP["criticalPath"][number];

interface Props {
  nodes: CPNode[];
  rowMap: Map<number, number>;
  geometries: Map<number, BarGeometry>;
  rowHeight: number;
}

export const GanttDependencyOverlay = memo(function GanttDependencyOverlay({ nodes, rowMap, geometries, rowHeight }: Props) {
  if (nodes.length < 2) return null;
  const mid = (geo: BarGeometry) => geo.y + 6 + (rowHeight - 12) / 2;

  return (
    <g pointerEvents="none">
      <defs>
        <marker id="gantt-arr-cp" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M1,1 L7,4 L1,7 Z" fill="#f87171" />
        </marker>
      </defs>
      {nodes.slice(0, -1).map((node, i) => {
        const next = nodes[i + 1];
        if (rowMap.get(node.ticketId) === undefined || rowMap.get(next.ticketId) === undefined) return null;
        const fg = geometries.get(node.ticketId);
        const tg = geometries.get(next.ticketId);
        if (!fg?.visible || !tg?.visible) return null;
        const x1 = fg.x + fg.width;
        const y1 = mid(fg);
        const x2 = tg.x;
        const y2 = mid(tg);
        return (
          <path
            key={`${node.ticketId}-${next.ticketId}`}
            d={`M ${x1} ${y1} h 12 V ${y2} H ${x2}`}
            fill="none"
            stroke="#f87171"
            strokeWidth={1.5}
            markerEnd="url(#gantt-arr-cp)"
          />
        );
      })}
    </g>
  );
});