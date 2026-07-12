"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { getCrmTokenClasses } from "@/features/crm/shared/metadata";
import {
  CHART_TOOLTIP_STYLE,
  AXIS_TICK,
} from "@/features/crm/shared/constants";
import {
  useCampaigns,
  useCampaignRoi,
  useCampaignLeads,
  useFirstTouchAttribution,
  useLastTouchAttribution,
} from "@/hooks/api/crm/campaigns";
import { formatCurrency } from "@/features/crm/reports/lib/types";
import type { CampaignAttribution } from "@/types/crm/campaigns";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  className?: string;
}

function StatCard({ label, value, subValue, className }: StatCardProps) {
  return (
    <Card className={cn("rounded-xl border border-border", className)}>
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1">{label}</p>
        <p className="text-2xl font-semibold tabular-nums">{value}</p>
        {subValue && <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>}
      </CardContent>
    </Card>
  );
}

function AttributionChart({ data }: { data: CampaignAttribution[] }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        No attribution data available
      </div>
    );
  }

  const chartData = data.slice(0, 10).map((d, i) => ({
    name: d.campaignName.length > 18 ? d.campaignName.slice(0, 18) + "…" : d.campaignName,
    revenue: Math.round(d.dealRevenueCents / 100),
    fill: getCrmTokenClasses(
      ["blue", "emerald", "amber", "sky", "violet", "cyan", "orange", "pink"][i % 8] ?? "blue"
    ).chartHex,
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" tick={AXIS_TICK} />
        <YAxis tick={AXIS_TICK} tickFormatter={(v: number) => `₹${(v / 1000).toFixed(0)}K`} />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
        />
        <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

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

  const handlePrevPage = useCallback(() => setLeadsPage((p) => Math.max(1, p - 1)), []);
  const handleNextPage = useCallback(() => setLeadsPage((p) => p + 1), []);

  if (listLoading) {
    return (
      <PageWrapper title="Campaign" backHref="/crm/campaigns">
        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-72 rounded-xl" />
        </div>
      </PageWrapper>
    );
  }

  const roiValue = roi?.roi ?? parseFloat(campaign?.roi ?? "0");
  const roiDisplay = isNaN(roiValue) ? "—" : `${roiValue.toFixed(1)}%`;
  const roiClass = roiValue > 0 ? "text-emerald-600" : roiValue < 0 ? "text-red-600" : "";

  const attributionData = attributionTab === "first-touch" ? (firstTouch ?? []) : (lastTouch ?? []);
  const attributionLoading = attributionTab === "first-touch" ? firstLoading : lastLoading;

  const leads = leadsData?.items ?? [];
  const totalLeads = leadsData?.total ?? 0;
  const totalPages = Math.ceil(totalLeads / 20);

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
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {roiLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
          ) : (
            <>
              <StatCard label="Total Leads" value={roi?.leads ?? campaign?.leads ?? 0} />
              <StatCard label="Converted" value={roi?.converted ?? "—"} />
              <StatCard
                label="Revenue"
                value={roi?.revenueCents ? formatCurrency(Math.round(roi.revenueCents / 100)) : "—"}
              />
              <StatCard
                label="ROI"
                value={roiDisplay}
                className={roiClass}
              />
            </>
          )}
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="rounded-xl border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={attributionTab} onValueChange={handleTabChange}>
                <TabsList className="mb-4 h-8">
                  <TabsTrigger value="first-touch" className="text-xs h-7">First Touch</TabsTrigger>
                  <TabsTrigger value="last-touch" className="text-xs h-7">Last Touch</TabsTrigger>
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
            <CardContent className="p-0">
              {leadsLoading ? (
                <div className="p-4 space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-full" />
                  ))}
                </div>
              ) : leads.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                  No leads tracked for this campaign
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent border-b-2">
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-3 py-2">Name</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-3 py-2">Status</TableHead>
                          <TableHead className="text-[10px] uppercase tracking-wider font-bold px-3 py-2">Source</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {leads.map((lead, i) => {
                          const l = lead as Record<string, unknown>;
                          return (
                            <TableRow key={String(l.id ?? i)} className="h-9 hover:bg-muted/30">
                              <TableCell className="px-3 py-1.5 text-[11px] font-medium">
                                {String(l.name ?? l.clientName ?? "—")}
                              </TableCell>
                              <TableCell className="px-3 py-1.5 text-[11px] capitalize text-muted-foreground">
                                {String(l.status ?? "—").toLowerCase()}
                              </TableCell>
                              <TableCell className="px-3 py-1.5 text-[11px] capitalize text-muted-foreground">
                                {String(l.source ?? "—").replace(/_/g, " ")}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-border">
                      <span className="text-xs text-muted-foreground">
                        Page {leadsPage} of {totalPages}
                      </span>
                      <div className="flex gap-1.5">
                        <button
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted/50 disabled:opacity-40"
                          disabled={leadsPage <= 1}
                          onClick={handlePrevPage}
                        >
                          Prev
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded border border-border hover:bg-muted/50 disabled:opacity-40"
                          disabled={leadsPage >= totalPages}
                          onClick={handleNextPage}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
