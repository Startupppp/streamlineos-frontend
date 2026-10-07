"use client";

import "react-grid-layout/css/styles.css";
import { useCallback, useMemo, type ReactNode } from "react";
import { GridLayout, useContainerWidth, type Layout } from "react-grid-layout";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { GRID_COLUMNS, toGridLayout, toStackedLayout, type WidgetSlot, type WidgetType } from "./dashboard-layout";
import { CommandCenterWidgetFrame, WIDGET_CONTROL_CLASS, WIDGET_DRAG_CLASS } from "./command-center-widget-frame";

const ROW_HEIGHT = 64;
const GRID_GAP = 16;
const WIDE_GRID_MIN_WIDTH = 768;
const SINGLE_COLUMN_SUMMARY_MAX_WIDTH = 327;
const TWO_COLUMN_SUMMARY_MAX_WIDTH = 639;

interface CommandCenterWidgetGridProps {
  widgets: readonly WidgetSlot[];
  content: Partial<Record<WidgetType, ReactNode>>;
  editing: boolean;
  onLayoutChange: (layout: Layout) => void;
  onStackedLayoutChange: (layout: Layout) => void;
  onRemove: (type: WidgetType) => void;
  onMove: (type: WidgetType, offset: -1 | 1) => void;
}

export function CommandCenterWidgetGrid({
  widgets,
  content,
  editing,
  onLayoutChange,
  onStackedLayoutChange,
  onRemove,
  onMove,
}: CommandCenterWidgetGridProps) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  /** Width 0 after mount paints a blank GridLayout — keep the skeleton until measured. */
  const ready = mounted && width > 0;
  const isWide = width >= WIDE_GRID_MIN_WIDTH;
  const canResize = editing && isWide;

  const layout = useMemo(
    () =>
      isWide
        ? toGridLayout(widgets)
        : toStackedLayout(
            widgets,
            width <= SINGLE_COLUMN_SUMMARY_MAX_WIDTH ? 3 : width <= TWO_COLUMN_SUMMARY_MAX_WIDTH ? 2 : 1,
          ),
    [isWide, widgets, width],
  );
  const gridConfig = useMemo(
    () => ({
      cols: isWide ? GRID_COLUMNS : 1,
      rowHeight: ROW_HEIGHT,
      margin: [GRID_GAP, GRID_GAP] as const,
      containerPadding: [0, 0] as const,
    }),
    [isWide],
  );
  const dragConfig = useMemo(
    () => ({ enabled: editing, handle: `.${WIDGET_DRAG_CLASS}`, cancel: `.${WIDGET_CONTROL_CLASS}` }),
    [editing],
  );
  const resizeConfig = useMemo(() => ({ enabled: canResize, handles: ["se", "e", "s"] as const }), [canResize]);
  const handleLayoutChange = useCallback(
    (next: Layout) => (isWide ? onLayoutChange(next) : onStackedLayoutChange(next)),
    [isWide, onLayoutChange, onStackedLayoutChange],
  );

  return (
    <div
      ref={containerRef}
      className={cn(
        "min-w-0 w-full max-w-full",
        "[&_.react-grid-placeholder]:rounded-xl [&_.react-grid-placeholder]:!bg-primary/15 [&_.react-grid-placeholder]:!opacity-100",
        "[&_.react-grid-item.react-draggable-dragging]:z-20 [&_.react-grid-item.react-draggable-dragging]:shadow-lg",
        !editing && "[&_.react-grid-item]:!transition-none",
      )}
      data-editing={editing ? "true" : undefined}
    >
      {ready ? (
        <GridLayout
          width={width}
          layout={layout}
          gridConfig={gridConfig}
          dragConfig={dragConfig}
          resizeConfig={resizeConfig}
          onDragStop={handleLayoutChange}
          onResizeStop={onLayoutChange}
        >
          {widgets.map((slot, index) => (
            <div key={slot.type} className="min-h-0 min-w-0">
              <CommandCenterWidgetFrame
                slot={slot}
                editing={editing}
                onRemove={onRemove}
                onMove={onMove}
                isFirst={index === 0}
                isLast={index === widgets.length - 1}
              >
                {content[slot.type]}
              </CommandCenterWidgetFrame>
            </div>
          ))}
        </GridLayout>
      ) : (
        <div
          className="grid min-w-0 w-full gap-4 sm:grid-cols-2"
          role="status"
          aria-busy
          aria-label="Loading widgets"
        >
          {widgets.map((slot) => (
            <Skeleton key={slot.type} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      )}
    </div>
  );
}
