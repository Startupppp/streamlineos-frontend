"use client";

import { useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard, StatCardGrid, StatCardGridSkeleton } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { RecordList } from "@/features/renderer";
import { useLeadLayout } from "@/features/crm/leads/use-lead-layout";
import { withColumns } from "@/lib/renderer/layout-adjustment";
import { CAMPAIGN_LAYOUT } from "@/lib/renderer/crm/campaign-layout";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { EmptyState } from "@/components/ui/empty-state";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import {
  useCampaigns,
  useCampaignRoi,
  useCampaignLeads,
  useFirstTouchAttribution,
  useLastTouchAttribution,
} from "@/hooks/api/crm/campaigns";
import { formatMoney } from "@/lib/format-utils";
import { type FieldTone, fieldByName, toneForSignedValue } from "@/lib/renderer/layout";
import type { StatTone } from "@/components/ui/stat-card";

const AttributionChart = dynamic(
  () => import("./attribution-chart").then((m) => ({ default: m.AttributionChart })),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> },
);

/**
 * The columns this panel shows of a lead.
 *
 * A narrowing of the lead description rather than a second one. The endpoint
 * sends a whole lead — `getCampaignLeads` projects sixteen fields — and the old
 * table declared three of them by hand, which is how an embedded panel and its
 * own record type drift apart. `withColumns` keeps one description and frames
 * it; a status the leads list starts toning is toned here on the same day.
 */
const PANEL_COLUMNS = ["name", "status", "source", "potentialValue"] as const;

interface CampaignDetailPageProps {
  campaignId: number;
}

export function CampaignDetailPage({ campaignId }: CampaignDetailPageProps) {
  const [leadsPage, setLeadsPage] = useState(1);
  const [attributionTab, setAttributionTab] = useState<"first-touch" | "last-touch">("first-touch");

  const money = useOrgDisplay();
  const leadLayout = useLeadLayout();
  const leadPanelLayout = useMemo(
    () => withColumns(leadLayout, PANEL_COLUMNS),
    [leadLayout],
  );

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

  /*
    The tile's tone comes from the campaign description saying ROI is a gain,
    not from a comparison written here. The hand-written version of this line
    was one of two colour rules on this screen that disagreed about zero.
  */
  const roiToneByFieldTone: Record<FieldTone, StatTone> = {
    success: "emerald",
    danger: "red",
    neutral: "default",
    warning: "amber",
    info: "blue",
  };
  const roiTone: StatTone =
    roiToneByFieldTone[toneForSignedValue(fieldByName(CAMPAIGN_LAYOUT, "roi")!, roiValue) ?? "neutral"];

  const attributionData = attributionTab === "first-touch" ? (firstTouch ?? []) : (lastTouch ?? []);
  const attributionLoading = attributionTab === "first-touch" ? firstLoading : lastLoading;

  const totalLeads = leadsData?.total ?? 0;
  const leadRows = (leadsData?.items ?? []) as Record<string, unknown>[];

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
                  value={roi?.revenueCents ? formatMoney(roi.revenueCents / 100, money) : "—"}
                  tone="amber"
                />
                <StatCard label="ROI" value={roiDisplay} tone={roiTone} />
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
                  <TabsTrigger value="first-touch">First Touch</TabsTrigger>
                  <TabsTrigger value="last-touch">Last Touch</TabsTrigger>
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
            <RecordList
              layout={leadPanelLayout}
              rows={leadRows}
              getRowKey={(row, index) => String(row.id ?? index)}
              isLoading={leadsLoading}
              money={money}
              emptyState={
                <EmptyState
                  compact
                  title="No leads from this campaign yet"
                  description="Leads tagged with this campaign appear here, so you can see what the spend returned."
                />
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
