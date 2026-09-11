"use client";

import { type KeyboardEvent, type MouseEvent } from "react";
import { getStatusHexColor } from "@/components/shared/ticket-status-badge";
import type { BarGeometry } from "./gantt-geometry";
import type { GanttRowBand } from "./gantt-row-window";

export interface GanttRowTicket {
  id: number;
  title: string;
  status: string;
  ticketNumber?: number;
  sequenceId?: string | null;
}

interface GanttTicketRowsProps {
  tickets: GanttRowTicket[];
  band: GanttRowBand;
  geometries: Map<number, BarGeometry>;
  criticalPathIds: Set<number>;
  svgWidth: number;
  rowHeight: number;
  titleMax: number;
  labelFontSize: number;
  onTicketClick: (ticketId: number) => void;
}

function ticketLabel(ticket: GanttRowTicket): string {
  return ticket.sequenceId ?? `#${ticket.ticketNumber ?? ticket.id}`;
}

/**
 * Only the rows inside the scrolled band are mounted. The band is a slice of
 * the same array in the same order, and each row still carries its position in
 * the whole timeline, so a screen reader reports "row 214 of 500" rather than
 * the window's own numbering.
 */
export function GanttTicketRows({
  tickets,
  band,
  geometries,
  criticalPathIds,
  svgWidth,
  rowHeight,
  titleMax,
  labelFontSize,
  onTicketClick,
}: GanttTicketRowsProps) {
  function activate(target: SVGGElement) {
    const id = Number(target.dataset.ticketId);
    if (id) onTicketClick(id);
  }

  function handleRowClick(event: MouseEvent<SVGGElement>) {
    activate(event.currentTarget);
  }

  function handleRowKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate(event.currentTarget);
  }

  return (
    <g role="list" aria-label="Timeline work items">
      {tickets.slice(band.firstRow, band.lastRow).map((ticket, index) => {
        const geo = geometries.get(ticket.id);
        if (!geo) return null;
        const y = geo.y;
        const isCp = criticalPathIds.has(ticket.id);
        const label = ticketLabel(ticket);
        const shortTitle =
          ticket.title.length > titleMax ? `${ticket.title.slice(0, titleMax)}…` : ticket.title;
        return (
          <g
            key={ticket.id}
            role="listitem"
            aria-posinset={band.firstRow + index + 1}
            aria-setsize={tickets.length}
            aria-label={`${label} ${ticket.title}`}
            tabIndex={0}
            data-ticket-id={ticket.id}
            onClick={handleRowClick}
            onKeyDown={handleRowKeyDown}
            className="cursor-pointer"
          >
            <title>{`${label} ${ticket.title}`}</title>
            <rect
              x={0}
              y={y}
              width={svgWidth}
              height={rowHeight}
              className="fill-transparent hover:fill-primary/[0.03]"
            />
            <line
              x1={0}
              y1={y}
              x2={svgWidth}
              y2={y}
              className="stroke-border/50"
              strokeWidth={0.5}
            />
            <text x={8} y={y + rowHeight / 2 + 4} className="fill-foreground" fontSize={labelFontSize}>
              {`${label} ${shortTitle}`}
            </text>
            {geo.visible ? (
              <rect
                x={geo.x}
                y={y + 6}
                width={geo.width}
                height={rowHeight - 12}
                rx={4}
                fill={getStatusHexColor(ticket.status)}
                opacity={0.85}
                {...(isCp ? { stroke: "var(--destructive)", strokeWidth: 2 } : {})}
              />
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
