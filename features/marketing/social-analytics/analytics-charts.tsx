"use client";

import { useMemo, useCallback } from "react";
import { BarChart2, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { SocialMetric } from "@/lib/api/hooks/marketing";
import { cn } from "@/lib/utils";
import { PLATFORM_COLORS, PLATFORM_BADGE } from "./platform-stats";
import { LogMetricsSheet } from "./log-metrics-sheet";

interface BarChartVizProps {
  metrics: SocialMetric[];
}

export function BarChartViz({ metrics }: BarChartVizProps) {
  const recent = useMemo(
    () =>
      [...metrics]
        .sort(
          (a, b) =>
            new Date(a.metricDate).getTime() - new Date(b.metricDate).getTime()
        )
        .slice(-8),
    [metrics]
  );

  if (recent.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        No data to display
      </div>
    );
  }

  const maxVal = Math.max(...recent.map((r) => r.impressions), 1);

  return (
    <div className="flex items-end gap-2 h-32 w-full">
      {recent.map((r) => {
        const heightPct = Math.max((r.impressions / maxVal) * 100, 2);
        const color = PLATFORM_COLORS[r.platform] ?? "bg-blue-500";
        return (
          <div
            key={r.id}
            className="flex flex-col items-center gap-1 flex-1 min-w-0"
          >
            <span className="text-[9px] text-muted-foreground font-medium">
              {r.impressions.toLocaleString()}
            </span>
            <div
              className={cn("w-full rounded-t-sm transition-all", color)}
              style={{ height: `${heightPct}%` }}
              title={`${r.metricDate}: ${r.impressions.toLocaleString()} impressions`}
            />
            <span className="text-[9px] text-muted-foreground truncate w-full text-center">
              {r.metricDate.slice(5)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

interface MetricsTableProps {
  metrics: SocialMetric[];
  isLoading: boolean;
  onDelete: (id: number) => void;
}

export function MetricsTable({
  metrics,
  isLoading,
  onDelete,
}: MetricsTableProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <BarChart2
          className="h-8 w-8 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="text-sm text-muted-foreground">
          No metrics logged yet. Click &quot;Log Metrics&quot; to add your
          first entry.
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="w-full" type="auto">
      <div className="min-w-[700px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs">Date</TableHead>
              <TableHead className="text-xs">Platform</TableHead>
              <TableHead className="text-xs text-right">Followers</TableHead>
              <TableHead className="text-xs text-right">Impressions</TableHead>
              <TableHead className="text-xs text-right">Engagements</TableHead>
              <TableHead className="text-xs text-right">Clicks</TableHead>
              <TableHead className="text-xs w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {metrics.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="text-sm font-medium">
                  {m.metricDate}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs capitalize",
                      PLATFORM_BADGE[m.platform] ?? ""
                    )}
                  >
                    {m.platform}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-right">
                  {m.followers.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-right">
                  {m.impressions.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-right">
                  {m.engagements.toLocaleString()}
                </TableCell>
                <TableCell className="text-sm text-right">
                  {m.clicks.toLocaleString()}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => onDelete(m.id)}
                    aria-label={`Delete metric entry from ${m.metricDate}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </ScrollArea>
  );
}

interface AnalyticsChartsProps {
  metrics: SocialMetric[];
  isLoading: boolean;
  sheetOpen: boolean;
  deleteId: number | null;
  isDeleting: boolean;
  onSheetClose: () => void;
  onDeleteRequest: (id: number) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}

export function AnalyticsCharts({
  metrics,
  isLoading,
  sheetOpen,
  deleteId,
  isDeleting,
  onSheetClose,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
}: AnalyticsChartsProps) {
  const handleDeleteDialogChange = useCallback(
    (v: boolean) => {
      if (!v) onDeleteCancel();
    },
    [onDeleteCancel]
  );

  return (
    <>
      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <BarChart2
              className="h-4 w-4 text-blue-600"
              aria-hidden="true"
            />
            Impressions — Last 8 Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <BarChartViz metrics={metrics} />
          )}
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Recent Entries (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <MetricsTable
            metrics={metrics}
            isLoading={isLoading}
            onDelete={onDeleteRequest}
          />
        </CardContent>
      </Card>

      <LogMetricsSheet open={sheetOpen} onClose={onSheetClose} />

      <AlertDialog
        open={deleteId !== null}
        onOpenChange={handleDeleteDialogChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Metric Entry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this metric entry? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={onDeleteConfirm}
              disabled={isDeleting}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
