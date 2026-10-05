"use client";

import { Pencil, IndianRupee, TrendingUp } from "lucide-react";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { Button } from "@/components/ui/button";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import {
  GalleryCase,
  GALLERY_STATIC_PAGINATION,
} from "@/features/build/shared/build-list-gallery-cases";

type GalleryMemberRow = { userId: string; hours: number; cost: number };

const MEMBER_NAMES: Record<string, string> = {
  user_priya: "Priya Nair",
  user_daniel: "Daniel Okafor",
};

const MEMBER_COST_ROWS: GalleryMemberRow[] = [
  { userId: "user_priya", hours: 120.5, cost: 240000 },
  { userId: "user_daniel", hours: 80.0, cost: 160000 },
];

const MEMBER_COST_COLUMNS: DataTableColumn<GalleryMemberRow>[] = [
  {
    key: "userId",
    header: "Member",
    cell: (row) => <span>{MEMBER_NAMES[row.userId] ?? row.userId}</span>,
  },
  {
    key: "hours",
    header: "Hours",
    className: "text-right w-[120px]",
    headerClassName: "text-right",
    cell: (row) => <span className="font-mono tabular-nums">{row.hours.toFixed(1)} hrs</span>,
  },
  {
    key: "cost",
    header: "Cost",
    className: "text-right w-[120px]",
    headerClassName: "text-right",
    cell: (row) => <span className="font-mono tabular-nums">₹{row.cost.toLocaleString("en-IN")}</span>,
  },
];

export function BudgetOverview() {
  function getRowKey(row: GalleryMemberRow) {
    return row.userId;
  }

  function renderMobileCard(row: GalleryMemberRow) {
    return (
      <BuildMobileCard
        title={MEMBER_NAMES[row.userId] ?? row.userId}
        meta={[
          { label: "Hours", value: `${row.hours.toFixed(1)} hrs` },
          { label: "Cost", value: `₹${row.cost.toLocaleString("en-IN")}` },
        ]}
      />
    );
  }

  return (
    <GalleryCase id="budget-overview" title="Budget · stat cards + member breakdown">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-medium text-foreground">Project Budget</h2>
          <Button size="sm" variant="outline" type="button">
            <Pencil className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
            Update Budget
          </Button>
        </div>
        <div className="flex flex-col gap-4 overflow-y-auto p-4">
          <StatCardGrid cols={3} stackOnMobile>
            <StatCard label="Planned" value="₹12,00,000" icon={IndianRupee} />
            <StatCard label="Actual" value="₹8,00,000" icon={TrendingUp} />
            <StatCard label="Remaining" value="₹4,00,000" icon={IndianRupee} tone="default" />
          </StatCardGrid>
          <DataTable
            data={MEMBER_COST_ROWS}
            columns={MEMBER_COST_COLUMNS}
            getRowKey={getRowKey}
            minWidth="400px"
            className={CONTENT_FILL_PANEL}
            mobileCard={renderMobileCard}
            pagination={GALLERY_STATIC_PAGINATION}
          />
        </div>
      </div>
    </GalleryCase>
  );
}
