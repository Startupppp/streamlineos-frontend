"use client";

import { useState, type KeyboardEvent, type MouseEvent, useRef } from "react";
import { getStatusHexColor } from "@/components/shared/ticket-status-badge";
import type { BarGeometry } from "./gantt-geometry";
import type { GanttRowBand } from "./gantt-row-window";

interface GanttRowTicket {
  id: number;
  title: string;
  status: string;
  startDate?: string | null;
  dueDate?: string | null;
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
  dayWidth: number;
  onTicketClick: (ticketId: number) => void;
  onReschedule: (ticketId: number, startDate: string | null, dueDate: string | null) => void;
}

interface ActiveDrag {
  ticketId: number;
  startX: number;
  startDate: string | null;
  dueDate: string | null;
}

function ticketLabel(ticket: GanttRowTicket): string {
  return ticket.sequenceId ?? `#${ticket.ticketNumber ?? ticket.id}`;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0] ?? dateStr;
}

export function GanttTicketRows({
  tickets,
  band,
  geometries,
  criticalPathIds,
  svgWidth,
  rowHeight,
  titleMax,
  labelFontSize,
  dayWidth,
  onTicketClick,
  onReschedule,
}: GanttTicketRowsProps) {
  const pointerDownPos = useRef<{ x: number; y: number } | null>(null);
  const activeDragRef = useRef<ActiveDrag | null>(null);
  const [dragPreview, setDragPreview] = useState<{ ticketId: number; pixelDx: number } | null>(null);

  function activate(target: SVGGElement) {
    const id = Number(target.dataset.ticketId);
    if (id) onTicketClick(id);
  }

  function handleMouseDown(event: MouseEvent<SVGGElement>) {
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
  }

  function handleRowClick(event: MouseEvent<SVGGElement>) {
    const down = pointerDownPos.current;
    if (down) {
      const dx = event.clientX - down.x;
      const dy = event.clientY - down.y;
      if (dx * dx + dy * dy > 16) return;
    }
    activate(event.currentTarget);
  }

  function handleRowKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    activate(event.currentTarget);
  }

  function handleBarPointerDown(event: React.PointerEvent<SVGGElement>) {
    const el = event.currentTarget;
    const ticketId = Number(el.dataset.barTicketId);
    if (!ticketId) return;
    event.stopPropagation();
    el.setPointerCapture(event.pointerId);
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
    activeDragRef.current = {
      ticketId,
      startX: event.clientX,
      startDate: el.dataset.startDate || null,
      dueDate: el.dataset.dueDate || null,
    };
  }

  function handleBarPointerMove(event: React.PointerEvent<SVGGElement>) {
    const drag = activeDragRef.current;
    if (!drag) return;
    setDragPreview({ ticketId: drag.ticketId, pixelDx: event.clientX - drag.startX });
  }

  function handleBarPointerUp(event: React.PointerEvent<SVGGElement>) {
    const drag = activeDragRef.current;
    if (!drag) return;
    activeDragRef.current = null;
    const dx = event.clientX - drag.startX;
    const dayOffset = Math.round(dx / dayWidth);
    setDragPreview(null);
    if (Math.abs(dx) <= 4) {
      onTicketClick(drag.ticketId);
    } else if (dayOffset !== 0) {
      const newStart = drag.startDate ? shiftDate(drag.startDate, dayOffset) : null;
      const newDue = drag.dueDate ? shiftDate(drag.dueDate, dayOffset) : null;
      onReschedule(drag.ticketId, newStart, newDue);
    }
  }

  function handleBarClick(event: React.MouseEvent<SVGGElement>) {
    event.stopPropagation();
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
        const previewDx = dragPreview?.ticketId === ticket.id ? dragPreview.pixelDx : 0;
        return (
          <g
            key={ticket.id}
            role="listitem"
            aria-posinset={band.firstRow + index + 1}
            aria-setsize={tickets.length}
            aria-label={`${label} ${ticket.title}`}
            tabIndex={0}
            data-ticket-id={ticket.id}
            onMouseDown={handleMouseDown}
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
              <g
                data-bar-ticket-id={ticket.id}
                data-start-date={ticket.startDate ?? ""}
                data-due-date={ticket.dueDate ?? ""}
                onPointerDown={handleBarPointerDown}
                onPointerMove={handleBarPointerMove}
                onPointerUp={handleBarPointerUp}
                onClick={handleBarClick}
                className="cursor-grab active:cursor-grabbing"
              >
                <title>{`Open ${label} ${ticket.title}. Drag to reschedule.`}</title>
                <rect
                  x={geo.x + previewDx}
                  y={y + 6}
                  width={geo.width}
                  height={rowHeight - 12}
                  rx={4}
                  fill={getStatusHexColor(ticket.status)}
                  opacity={previewDx !== 0 ? 0.7 : 0.85}
                  {...(isCp ? { stroke: "var(--destructive)", strokeWidth: 2 } : {})}
                />
              </g>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
