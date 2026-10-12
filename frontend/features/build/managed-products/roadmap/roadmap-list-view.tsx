"use client";

import { useMemo, useCallback } from "react";
import { DataTable } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import type { ScorableRoadmapItem } from "@/features/build/roadmap/roadmap-item-card";
import {
  ROADMAP_HORIZON_LABEL,
  ROADMAP_STATUS_BADGE_VARIANT,
  ROADMAP_STATUS_LABEL,
} from "@/features/build/roadmap/roadmap-constants";
import { roadmapTargetDate } from "../product-roadmap-model";
import { getUserDisplayName } from "@/lib/person-display";

interface RoadmapListViewProps {
  items: ScorableRoadmapItem[];
  onEdit: (item: ScorableRoadmapItem) => void;
  pagination?: {
    pageSize: number;
    hasMore: boolean;
    hasPrevious: boolean;
    pageNumber: number;
    onNext: () => void;
    onPrevious: () => void;
  };
}

export function RoadmapListView({ items, onEdit, pagination }: RoadmapListViewProps) {
  const handleRowClick = useCallback((item: ScorableRoadmapItem) => { onEdit(item); }, [onEdit]);
  const getRowKey = useCallback((item: ScorableRoadmapItem) => item.id, []);

  const columns = useMemo(
    () => [
      {
        key: "title",
        header: "Title",
        cell: (item: ScorableRoadmapItem) => (
          <span className="font-medium">{item.title}</span>
        ),
      },
      {
        key: "horizon",
        header: "Horizon",
        cell: (item: ScorableRoadmapItem) => (
          <Badge variant="outline" className="text-xs capitalize">
            {ROADMAP_HORIZON_LABEL[item.horizon] ?? item.horizon}
          </Badge>
        ),
      },
      {
        key: "status",
        header: "Status",
        cell: (item: ScorableRoadmapItem) => (
          <Badge variant={ROADMAP_STATUS_BADGE_VARIANT[item.status] ?? "outline"} className="text-xs">
            {ROADMAP_STATUS_LABEL[item.status] ?? item.status.replace(/_/g, " ")}
          </Badge>
        ),
      },
      {
        key: "owner",
        header: "Owner",
        cell: (item: ScorableRoadmapItem) =>
          item.owner ? (
            <span className="text-sm">{getUserDisplayName(item.owner)}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        key: "team",
        header: "Team",
        cell: (item: ScorableRoadmapItem) =>
          item.team ? (
            <span className="text-sm">{item.team.name}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
      {
        key: "target",
        header: "Target",
        cell: (item: ScorableRoadmapItem) => {
          const date = roadmapTargetDate(item);
          return date ? (
            <span className="text-sm tabular-nums">{date}</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          );
        },
      },
      {
        key: "confidence",
        header: "Confidence",
        cell: (item: ScorableRoadmapItem) =>
          item.confidence != null ? (
            <span className="text-sm tabular-nums font-mono">{item.confidence}%</span>
          ) : (
            <span className="text-sm text-muted-foreground">—</span>
          ),
      },
    ],
    [],
  );

  return (
    <DataTable
      data={items}
      columns={columns}
      getRowKey={getRowKey}
      onRowClick={handleRowClick}
      pagination={
        pagination
          ? {
              mode: "cursor",
              pageSize: pagination.pageSize,
              hasMore: pagination.hasMore,
              hasPrevious: pagination.hasPrevious,
              pageNumber: pagination.pageNumber,
              onNext: pagination.onNext,
              onPrevious: pagination.onPrevious,
            }
          : undefined
      }
    />
  );
}
