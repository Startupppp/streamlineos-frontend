"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { TruncatedText } from "@/components/ui/truncated-text";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useCampaigns,
  useCampaignRoi,
  useCampaignLeads,
  useFirstTouchAttribution,
  useLastTouchAttribution,
} from "@/hooks/api/crm/campaigns";
import { formatCurrency } from "@/features/crm/reports/lib/types";

const AttributionChart = dynamic(
  () => import("./attribution-chart").then((m) => ({ default: m.AttributionChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);

interface CampaignLeadItem {
  id?: string | number;
  name?: string;
  clientName?: string;
  status?: string;
  source?: string;
}

function getString(val: unknown): string {
  return typeof val === "string" ? val : typeof val === "number" ? String(val) : "—";
}

function toCampaignLeadItem(raw: unknown): CampaignLeadItem {
  if (typeof raw !== "object" || raw === null) return {};
  const r = raw as Record<string, unknown>;
  return {
    id: typeof r.id === "string" || typeof r.id === "number" ? r.id : undefined,
    name: typeof r.name === "string" ? r.name : undefined,
    clientName: typeof r.clientName === "string" ? r.clientName : undefined,
    status: typeof r.status === "string" ? r.status : undefined,
    source: typeof r.source === "string" ? r.source : undefined,
  };
}

const leadColumns: DataTableColumn<CampaignLeadItem & { _idx: number }>[] = [
  {
    key: "name",
    header: "Name",
    cell: (row) => (
      <TruncatedText text={getString(row.name ?? row.clientName)} className="text-[11px] font-medium max-w-[140px]" />
    ),
  },
  {
    key: "status",
    header: "Status",
    cell: (row) => (
      <span className="text-[11px] capitalize text-muted-foreground">
        {getString(row.status).toLowerCase()}
      </span>
    ),
  },
  {
    key: "source",
    header: "Source",
    cell: (row) => (
      <span className="text-[11px] capitalize text-muted-foreground">
        {getString(row.source).replace(/_/g, " ")}
      </span>
    ),
  },
];

interface CampaignDetailPageProps {
  campaignId: number;
}

export function CampaignDetailPage({ campaignId }: CampaignDetailPageProps) {
  const [leadsPage, setLeadsPage] = useState(1);
  const [attributionTab, setAttributionTab] = useState<"first-touch" | "last-touch">("first-touch");

  const { data: listData, isLoading: listLoading } = useCampaigns({ limit: 200 });
  const campaign = listData?.items.find((c) => c.id === campaignId);

  const { data: roi, isLoading: roiLoading } = useCampaignRoi(campaignId);
  const { data: leadsData, isLoading: leadsLoading } = useCampaignLeads(campaignId, {
    page: leadsPage,
    limit: 20,
  });

  const { data: firstTouch, isLoading: firstLoading } = useFirstTouchAttribution();
  const { data: lastTouch, isLoading: lastLoading } = useLastTouchAttribution();

  const handleTabChange = useCallback((v: string) => {
    setAttributionTab(v as "first-touch" | "last-touch");
  }, []);

  const handleLeadsPageChange = useCallback((page: number) => {
    setLeadsPage(page);
  }, []);

  if (listLoading) {
    return (
      <PageWrapper title="Campaign" backHref="/crm/campaigns">
        <div className="space-y-4">
          <StatCardGridSkeleton cols={4} count={4} />
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  const roiValue = roi?.roi ?? parseFloat(campaign?.roi ?? "0");
  const roiDisplay = isNaN(roiValue) ? "—" : `${roiValue.toFixed(1)}%`;

  const attributionData = attributionTab === "first-touch" ? (firstTouch ?? []) : (lastTouch ?? []);
  const attributionLoading = attributionTab === "first-touch" ? firstLoading : lastLoading;

  const totalLeads = leadsData?.total ?? 0;

  const indexedLeads = (leadsData?.items ?? []).map((raw, i) => ({
    ...toCampaignLeadItem(raw),
    _idx: i,
  }));

  return (
    <PageWrapper
      title={campaign?.name ?? "Campaign"}
      subtitle={campaign?.channel?.replace(/_/g, " ") ?? undefined}
      backHref="/crm/campaigns"
      badge={
        campaign?.status ? (
          <Badge variant="outline" className="text-xs capitalize">
            {campaign.status}
          </Badge>
        ) : undefined
      }
    >
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="space-y-4"
      >
        <motion.div variants={fadeUp}>
          <StatCardGrid cols={4}>
            {roiLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : (
              <>
                <StatCard label="Total Leads" value={roi?.leads ?? campaign?.leads ?? 0} tone="blue" />
                <StatCard label="Converted" value={roi?.converted ?? "—"} tone="emerald" />
                <StatCard
                  label="Revenue"
                  value={roi?.revenueCents ? formatCurrency(Math.round(roi.revenueCents / 100)) : "—"}
                  tone="amber"
                />
                <StatCard
                  label="ROI"
                  value={roiDisplay}
                  tone={roiValue > 0 ? "emerald" : roiValue < 0 ? "red" : "default"}
                />
              </>
            )}
          </StatCardGrid>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="rounded-xl border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={attributionTab} onValueChange={handleTabChange}>
                <TabsList className="mb-4">
                  <TabsTrigger value="first-touch" className="text-xs">First Touch</TabsTrigger>
                  <TabsTrigger value="last-touch" className="text-xs">Last Touch</TabsTrigger>
                </TabsList>
                <TabsContent value={attributionTab} forceMount>
                  {attributionLoading ? (
                    <Skeleton className="h-[280px] w-full" />
                  ) : (
                    <AttributionChart data={attributionData} />
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="rounded-xl border border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Leads</CardTitle>
                <span className="text-xs text-muted-foreground">{totalLeads} total</span>
              </div>
            </CardHeader>
            <DataTable
              data={indexedLeads}
              columns={leadColumns}
              getRowKey={(row) => String(row.id ?? row._idx)}
              isLoading={leadsLoading}
              emptyState={
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                  No leads tracked for this campaign
                </div>
              }
              pagination={{
                mode: "server",
                page: leadsPage,
                pageSize: 20,
                total: totalLeads,
                onPageChange: handleLeadsPageChange,
              }}
            />
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
