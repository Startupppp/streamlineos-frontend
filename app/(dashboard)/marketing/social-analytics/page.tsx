"use client";

import { useState, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { useSocialMetrics, useDeleteSocialMetric } from "@/lib/api/hooks/marketing";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  PlatformFilterTabs,
  PlatformStats,
  type PlatformFilter,
} from "@/features/marketing/social-analytics/platform-stats";
import { AnalyticsCharts } from "@/features/marketing/social-analytics/analytics-charts";

export default function SocialAnalyticsPage() {
  const [activePlatform, setActivePlatform] = useState<PlatformFilter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const platform = activePlatform === "all" ? undefined : activePlatform;
  const { data, isLoading } = useSocialMetrics(platform, 30);
  const { mutate: deleteMetric, isPending: isDeleting } = useDeleteSocialMetric();

  const metrics = data?.metrics ?? [];
  const summary = data?.summary ?? {
    avgEngagement: 0,
    totalImpressions: 0,
    totalClicks: 0,
    followerGrowth: 0,
  };

  const totalFollowers = useMemo(
    () =>
      metrics.length > 0 ? Math.max(...metrics.map((m) => m.followers)) : 0,
    [metrics]
  );

  const handlePlatformChange = useCallback(
    (p: PlatformFilter) => setActivePlatform(p),
    []
  );
  const handleSheetOpen = useCallback(() => setSheetOpen(true), []);
  const handleSheetClose = useCallback(() => setSheetOpen(false), []);
  const handleDeleteRequest = useCallback((id: number) => setDeleteId(id), []);
  const handleDeleteCancel = useCallback(() => setDeleteId(null), []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteId) return;
    deleteMetric(deleteId, {
      onSuccess: () => {
        toast.success("Metric entry deleted");
        setDeleteId(null);
      },
      onError: (error) => {
        toast.error(getErrorMessage(error));
        setDeleteId(null);
      },
    });
  }, [deleteId, deleteMetric]);

  return (
    <PageWrapper
      title="Social Media Analytics"
      subtitle="Track engagement metrics across platforms"
      actions={
        <Button onClick={handleSheetOpen} aria-label="Log new social metrics">
          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
          Log Metrics
        </Button>
      }
    >
      <PlatformFilterTabs
        activePlatform={activePlatform}
        onPlatformChange={handlePlatformChange}
      />

      <PlatformStats
        isLoading={isLoading}
        totalFollowers={totalFollowers}
        summary={summary}
      />

      <AnalyticsCharts
        metrics={metrics}
        isLoading={isLoading}
        sheetOpen={sheetOpen}
        deleteId={deleteId}
        isDeleting={isDeleting}
        onSheetClose={handleSheetClose}
        onDeleteRequest={handleDeleteRequest}
        onDeleteConfirm={handleDeleteConfirm}
        onDeleteCancel={handleDeleteCancel}
      />
    </PageWrapper>
  );
}
