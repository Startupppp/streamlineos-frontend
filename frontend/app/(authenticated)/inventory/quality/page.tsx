"use client";

import { Suspense } from "react";
import { useRouter } from "next/navigation";
import { ClipboardCheck, ShieldAlert, AlertTriangle, Package } from "lucide-react";
import { PageWrapper, PageSection } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { InventoryEmptyState } from "@/features/inventory/components/inventory-empty-state";
import { EmptyOrdersIllustration } from "@/components/illustrations";
import { useQualityInspections, useQualityHolds, useRecalls } from "@/hooks/api/inventory/quality";
import type { Inspection } from "@/hooks/api/inventory/quality";
import { INSPECTION_STATUS_BADGE, INSPECTION_STATUS_LABEL } from "@/features/inventory/lib";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

function QualityHubInner() {
  const router = useRouter();

  const pendingQuery = useQualityInspections({ status: "PENDING", limit: 1 });
  const inProgressQuery = useQualityInspections({ status: "IN_PROGRESS", limit: 1 });
  const holdsQuery = useQualityHolds({ status: "ACTIVE", limit: 1 });
  const recallsQuery = useRecalls({ limit: 100 });
  const recentQuery = useQualityInspections({ limit: 5 });

  const openRecalls = (recallsQuery.data?.items ?? []).filter((r) => r.status !== "CLOSED").length;
  const recentInspections = recentQuery.data?.items ?? [];

  function handleViewInspections(): void {
    router.push("/inventory/quality/inspections");
  }

  function handleViewHolds(): void {
    router.push("/inventory/quality/holds");
  }

  function handleViewRecalls(): void {
    router.push("/inventory/quality/recalls");
  }

  const columns: DataTableColumn<Inspection>[] = [
    {
      key: "status",
      header: "Status",
      cell: (r) => (
        <Badge
          variant="outline"
          className={cn("h-4 text-[9px] px-1.5 py-0 border", INSPECTION_STATUS_BADGE[r.status])}
        >
          {INSPECTION_STATUS_LABEL[r.status]}
        </Badge>
      ),
    },
    {
      key: "source",
      header: "Source",
      className: "text-muted-foreground",
      cell: (r) => r.source ?? "—",
    },
    {
      key: "lines",
      header: "Lines",
      headerClassName: "w-[60px] text-right",
      className: "text-right tabular-nums text-muted-foreground",
      cell: (r) => r.lines.length,
    },
    {
      key: "createdAt",
      header: "Created",
      headerClassName: "w-[120px]",
      className: "text-muted-foreground",
      cell: (r) => format(new Date(r.createdAt), "dd MMM yyyy"),
    },
  ];

  return (
    <PageWrapper
      eyebrow="Inventory · Quality"
      title="Quality Hub"
      subtitle="Overview of inspections, holds, and recalls"
    >
      <div className="space-y-6">
        <StatCardGrid cols={4}>
          <StatCard
            label="Pending Inspections"
            value={pendingQuery.data?.total ?? 0}
            icon={ClipboardCheck}
            tone="blue"
            href="/inventory/quality/inspections?status=PENDING"
            isLoading={pendingQuery.isLoading}
          />
          <StatCard
            label="In Progress"
            value={inProgressQuery.data?.total ?? 0}
            icon={Package}
            tone="amber"
            href="/inventory/quality/inspections?status=IN_PROGRESS"
            isLoading={inProgressQuery.isLoading}
          />
          <StatCard
            label="Active Holds"
            value={holdsQuery.data?.total ?? 0}
            icon={ShieldAlert}
            tone="red"
            href="/inventory/quality/holds?status=ACTIVE"
            isLoading={holdsQuery.isLoading}
          />
          <StatCard
            label="Open Recalls"
            value={openRecalls}
            icon={AlertTriangle}
            tone="amber"
            href="/inventory/quality/recalls"
            isLoading={recallsQuery.isLoading}
          />
        </StatCardGrid>

        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" onClick={handleViewInspections}>
            View Inspections
          </Button>
          <Button size="sm" variant="outline" onClick={handleViewHolds}>
            View Holds
          </Button>
          <Button size="sm" variant="outline" onClick={handleViewRecalls}>
            View Recalls
          </Button>
        </div>

        <PageSection title="Recent Inspections">
          <DataTable
            data={recentInspections}
            columns={columns}
            getRowKey={(r) => r.id}
            isLoading={recentQuery.isLoading}
            emptyState={
              <InventoryEmptyState
                illustration={<EmptyOrdersIllustration />}
                title="No inspections yet"
                description="Quality inspections will appear here once created."
                className="border-0 bg-transparent min-h-[20vh]"
              />
            }
            minWidth="480px"
          />
        </PageSection>
      </div>
    </PageWrapper>
  );
}

export default function QualityHubPage() {
  return (
    <Suspense>
      <QualityHubInner />
    </Suspense>
  );
}
