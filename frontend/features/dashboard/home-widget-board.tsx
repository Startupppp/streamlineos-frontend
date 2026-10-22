"use client";

import "react-grid-layout/css/styles.css";
import { useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { GridLayout, useContainerWidth, type Compactor, type Layout } from "react-grid-layout";
import { cn } from "@/lib/utils";
import type { HomeDensity } from "./use-home-customisation";
import {
  HOME_GRID_COLUMNS,
  HOME_WIDE_GRID_MIN_WIDTH,
  compactHomeLayout,
  homeLayoutChanged,
  markResizedItems,
  presentHomeLayout,
  reflowHomeLayout,
  stackHomeLayout,
  type HomeLayoutCommit,
  type HomeLayoutItem,
  type HomeWidgetSize,
} from "./home-widget-layout";
import {
  HomeWidgetFrame,
  HOME_WIDGET_CONTROL_CLASS,
  HOME_WIDGET_DRAG_CLASS,
} from "./home-widget-frame";

const ROW_HEIGHT = { comfortable: 64, compact: 48 } as const;
const GRID_GAP = { comfortable: 16, compact: 8 } as const;

interface HomeWidgetBoardProps {
  orderedIds: readonly string[];
  placements: readonly HomeWidgetSize[];
  density: HomeDensity;
  editing: boolean;
  content: Record<string, ReactNode>;
  labels: Record<string, string>;
  onLayoutCommit: (items: readonly HomeLayoutCommit[], stacked: boolean) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, offset: -1 | 1) => void;
}

export function HomeWidgetBoard({
  orderedIds,
  placements,
  density,
  editing,
  content,
  labels,
  onLayoutCommit,
  onRemove,
  onMove,
}: HomeWidgetBoardProps) {
  const { width, containerRef, mounted } = useContainerWidth({ measureBeforeMount: true });
  const ready = mounted && width > 0;
  const isWide = width >= HOME_WIDE_GRID_MIN_WIDTH;
  const gapClass = density === "compact" ? "gap-2" : "gap-4";
  const orderKey = orderedIds.join("\0");
  const placementKey = placements.map((item) => `${item.id}:${item.w}x${item.h}`).join("|");
  const layout = useMemo(() => {
    const ids = orderKey.length === 0 ? [] : orderKey.split("\0");
    const sizes: HomeWidgetSize[] =
      placementKey.length === 0
        ? []
        : placementKey.split("|").flatMap((token) => {
            const separator = token.lastIndexOf(":");
            const [widthText, heightText] = token.slice(separator + 1).split("x");
            const w = Number(widthText);
            const h = Number(heightText);
            if (separator <= 0 || !Number.isFinite(w) || !Number.isFinite(h)) return [];
            return [{ id: token.slice(0, separator), w, h }];
          });
    return isWide
      ? presentHomeLayout(ids, sizes, density)
      : stackHomeLayout(ids, sizes, density);
  }, [density, isWide, orderKey, placementKey]);
  const previousLayoutRef = useRef<HomeLayoutItem[] | null>(null);
  const placementsRef = useRef(placements);
  const seenOrderRef = useRef(orderKey);
  placementsRef.current = placements;
  const compactor = useMemo<Compactor>(
    () => ({
      type: "wrap",
      allowOverlap: false,
      compact: (next, cols) => {
        if (cols !== HOME_GRID_COLUMNS) return compactHomeLayout(next, cols);
        const marked = markResizedItems(next, previousLayoutRef.current);
        const compacted = compactHomeLayout(marked, cols);
        previousLayoutRef.current = compacted;
        return compacted;
      },
    }),
    [],
  );
  const gridConfig = useMemo(
    () => ({
      cols: isWide ? 12 : 1,
      rowHeight: ROW_HEIGHT[density],
      margin: [GRID_GAP[density], GRID_GAP[density]] as const,
      containerPadding: [0, 0] as const,
    }),
    [density, isWide],
  );
  const dragConfig = useMemo(
    () => ({
      enabled: editing,
      handle: `.${HOME_WIDGET_DRAG_CLASS}`,
      cancel: `.${HOME_WIDGET_CONTROL_CLASS}`,
    }),
    [editing],
  );
  const resizeConfig = useMemo(
    () => ({ enabled: editing && isWide, handles: ["se", "e", "s"] as const }),
    [editing, isWide],
  );
  const commit = useCallback(
    (next: Layout, stacked: boolean) => {
      onLayoutCommit(
        next.map((item) => ({
          id: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
        })),
        stacked,
      );
    },
    [onLayoutCommit],
  );
  const handleDragStop = useCallback(
    (next: Layout) => commit(next, !isWide),
    [commit, isWide],
  );
  const handleResizeStop = useCallback(
    (next: Layout) => commit(next, false),
    [commit],
  );
  useEffect(() => {
    if (seenOrderRef.current === orderKey) return;
    seenOrderRef.current = orderKey;
    if (orderKey.length === 0) return;
    const ids = orderKey.split("\0");
    const filled = reflowHomeLayout(ids, placementsRef.current, density);
    if (!homeLayoutChanged(ids, placementsRef.current, filled)) return;
    onLayoutCommit(filled, false);
  }, [density, onLayoutCommit, orderKey]);
  const handleRemove = useCallback(
    (id: string) => {
      const index = orderedIds.indexOf(id);
      const neighbour = orderedIds[index + 1] ?? orderedIds[index - 1];
      onRemove(id);
      if (!neighbour) return;
      requestAnimationFrame(() => {
        containerRef.current
          ?.querySelector<HTMLElement>(
            `[data-widget-id="${neighbour}"] .${HOME_WIDGET_CONTROL_CLASS}`,
          )
          ?.focus();
      });
    },
    [containerRef, onRemove, orderedIds],
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
          compactor={compactor}
          onDragStop={handleDragStop}
          onResizeStop={handleResizeStop}
        >
          {layout.map((item, index) => (
            <div key={item.i} className="h-full min-h-0 min-w-0">
              <HomeWidgetFrame
                id={item.i}
                label={labels[item.i] ?? item.i}
                editing={editing}
                isFirst={index === 0}
                isLast={index === layout.length - 1}
                onRemove={handleRemove}
                onMove={onMove}
              >
                {content[item.i]}
              </HomeWidgetFrame>
            </div>
          ))}
        </GridLayout>
      ) : (
        <div className={cn("grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3", gapClass)}>
          {orderedIds.map((id) => (
            <div key={id} className="min-w-0">
              {content[id]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
