"use client";

import { useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Download, CalendarDays, TrendingUp, Users,
  BarChart3, PieChart as PieChartIcon, Activity, Target, Filter,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  FunnelChart, Funnel, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { staggerContainer, fadeUp } from "@/lib/motion-variants";
import { api } from "@/trpc/react";
import ExcelJS from "exceljs";

const COLORS = ["#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#0EA5E9", "#EC4899", "#6366F1"];

async function downloadXLSX(data: Record<string, unknown>[], filename: string) {
  if (data.length === 0) return;
  const workbook = new ExcelJS.Workbook();
  const ws = workbook.addWorksheet("Data");
  const headers = Object.keys(data[0]);
  ws.columns = headers.map(h => ({ header: h, key: h, width: Math.max(h.length + 4, 12) }));
  ws.getRow(1).font = { bold: true };
  for (const row of data) {
    ws.addRow(headers.map(h => row[h] ?? ""));
  }
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CrmAnalyticsPage() {
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const applyFilters = useCallback(() => {
    setDateFrom(draftDateFrom);
    setDateTo(draftDateTo);
  }, [draftDateFrom, draftDateTo]);

  const { data: leadStats, isLoading: statsLoading } = api.leads.getStats.useQuery({
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  });

  const { data: allDeals, isLoading: dealsLoading } = api.deals.getAll.useQuery({});
  const { data: leaderboard, isLoading: leaderLoading } = api.leads.getSalesLeaderboard.useQuery();
  const { data: slaReport, isLoading: slaLoading } = api.crmSla.getSlaReport.useQuery();
  const { data: allLeadsResult, isLoading: leadsLoading } = api.leads.getAll.useQuery({ limit: 100 });
  const allLeads = allLeadsResult?.leads;

  const isLoading = statsLoading || dealsLoading || leaderLoading || slaLoading || leadsLoading;

  const funnelData = useMemo(() => {
    if (!leadStats) return [];
    const stages = [
      { name: "New", value: leadStats.byStatus.NEW, fill: "#3B82F6" },
      { name: "Contacted", value: leadStats.byStatus.CONTACTED, fill: "#0EA5E9" },
      { name: "Interested", value: leadStats.byStatus.INTERESTED, fill: "#F59E0B" },
      { name: "Qualified", value: leadStats.byStatus.QUALIFIED, fill: "#8B5CF6" },
      { name: "Converted", value: leadStats.byStatus.CONVERTED, fill: "#10B981" },
    ];
    return stages.filter(s => s.value > 0);
  }, [leadStats]);

  const leadVolumeTrend = useMemo(() => {
    if (!allLeads) return [];
    const weeks: Record<string, number> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i * 7);
      const key = `W${12 - i}`;
      weeks[key] = 0;
    }
    allLeads.forEach(lead => {
      const created = new Date(lead.createdAt!);
      const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      const weekIndex = Math.floor(diffDays / 7);
      if (weekIndex < 12) {
        const key = `W${12 - weekIndex}`;
        if (weeks[key] !== undefined) weeks[key]++;
      }
    });
    return Object.entries(weeks).map(([week, count]) => ({ week, leads: count }));
  }, [allLeads]);

  const sourceBreakdown = useMemo(() => {
    if (!allLeads) return [];
    const map: Record<string, number> = {};
    allLeads.forEach(l => {
      const src = l.source?.replace("_", " ") ?? "unknown";
      map[src] = (map[src] ?? 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [allLeads]);

  const dealsByStageValue = useMemo(() => {
    if (!allDeals) return [];
    const map: Record<string, number> = {};
    allDeals.forEach(d => {
      map[d.stage] = (map[d.stage] ?? 0) + Number(d.value ?? 0);
    });
    return Object.entries(map).map(([stage, value]) => ({ stage, value: Math.round(value / 100000) }));
  }, [allDeals]);

  const wonLostReasons = useMemo(() => {
    if (!allDeals) return [];
    const won = allDeals.filter(d => d.stage === "WON").length;
    const lost = allDeals.filter(d => d.stage === "LOST").length;
    const data = [];
    if (won > 0) data.push({ name: "Won", value: won });
    if (lost > 0) data.push({ name: "Lost", value: lost });
    return data;
  }, [allDeals]);

  const slaComplianceTrend = useMemo(() => {
    if (!slaReport) return [];
    return [
      { period: "Current", rate: slaReport.complianceRate },
    ];
  }, [slaReport]);

  const scoreDistribution = useMemo(() => {
    if (!allLeads) return [];
    const buckets = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
    allLeads.forEach(l => {
      const score = (l as Record<string, unknown>).score as number | null ?? 0;
      if (score <= 20) buckets["0-20"]++;
      else if (score <= 40) buckets["21-40"]++;
      else if (score <= 60) buckets["41-60"]++;
      else if (score <= 80) buckets["61-80"]++;
      else buckets["81-100"]++;
    });
    return Object.entries(buckets).map(([range, count]) => ({ range, count }));
  }, [allLeads]);

  if (isLoading) {
    return (
      <div className="space-y-6 p-6">
        {/* Header + date filters */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-36" />
            <Skeleton className="h-8 w-20" />
          </div>
        </div>
        {/* 2-col chart cards grid (8 cards) */}
        <div className="grid gap-4 md:grid-cols-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-7 w-7 rounded" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[280px] w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6 p-6"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={fadeUp} className="flex items-center justify-between flex-wrap gap-4">
        <PageHeader title="CRM Analytics" description="Pipeline insights and performance metrics" />
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">From</Label>
            <Input type="date" value={draftDateFrom} onChange={e => setDraftDateFrom(e.target.value)} readOnly={false} onKeyDown={e => e.preventDefault()} className="w-36 h-8 text-xs cursor-pointer" />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">To</Label>
            <Input type="date" value={draftDateTo} onChange={e => setDraftDateTo(e.target.value)} readOnly={false} onKeyDown={e => e.preventDefault()} className="w-36 h-8 text-xs cursor-pointer" />
          </div>
          <Button size="sm" className="h-8 bg-[#bd882c] hover:bg-[#a67724] text-white" onClick={applyFilters}>
            <Filter className="mr-1.5 h-3.5 w-3.5" />
            Apply
          </Button>
        </div>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2">
        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Pipeline Funnel</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX(funnelData, "pipeline-funnel")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} width={80} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, i) => (
                      <Cell key={i} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lead Volume Trend (12 weeks)</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX(leadVolumeTrend, "lead-volume-trend")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={leadVolumeTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Line type="monotone" dataKey="leads" stroke="#bd882c" strokeWidth={2} dot={{ fill: "#bd882c", r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Lead Source Breakdown</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX(sourceBreakdown, "lead-sources")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={sourceBreakdown} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ""} ${((percent ?? 0) * 100).toFixed(0)}%`}>
                    {sourceBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Rep Performance</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX((leaderboard ?? []).map(l => ({ name: l.name, score: l.score, converted: l.leadsConverted, calls: l.totalCalls })), "rep-performance")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-[280px] overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Rep</TableHead>
                      <TableHead className="text-xs text-right">Leads</TableHead>
                      <TableHead className="text-xs text-right">Converted</TableHead>
                      <TableHead className="text-xs text-right">Calls</TableHead>
                      <TableHead className="text-xs text-right">Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaderboard?.map((rep, i) => (
                      <TableRow key={rep.userId}>
                        <TableCell className="text-xs font-medium">
                          <span className="mr-1.5 text-muted-foreground">{i + 1}.</span>
                          {rep.name}
                        </TableCell>
                        <TableCell className="text-xs text-right">{rep.leadsAssigned}</TableCell>
                        <TableCell className="text-xs text-right text-emerald-400">{rep.leadsConverted}</TableCell>
                        <TableCell className="text-xs text-right">{rep.totalCalls}</TableCell>
                        <TableCell className="text-xs text-right font-semibold">{rep.score}</TableCell>
                      </TableRow>
                    ))}
                    {(!leaderboard || leaderboard.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-6">No data</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Won vs Lost</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX(wonLostReasons, "won-vs-lost")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={wonLostReasons} cx="50%" cy="50%" outerRadius={100} dataKey="value" label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""}: ${value ?? 0}`}>
                    {wonLostReasons.map((entry, i) => (
                      <Cell key={i} fill={entry.name === "Won" ? "#10B981" : "#EF4444"} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Deal Value by Stage</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX(dealsByStageValue, "deal-value-by-stage")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dealsByStageValue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="stage" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(value) => [`₹${value}L`, "Value"]} />
                  <Bar dataKey="value" fill="#bd882c" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">SLA Compliance Rate</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX(slaComplianceTrend, "sla-compliance")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              {slaReport && (
                <div className="flex flex-col items-center justify-center h-[280px]">
                  <div className="relative h-40 w-40">
                    <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                      <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--border))" strokeWidth="8" />
                      <circle
                        cx="50" cy="50" r="42" fill="none"
                        stroke={slaReport.complianceRate >= 80 ? "#10B981" : slaReport.complianceRate >= 50 ? "#F59E0B" : "#EF4444"}
                        strokeWidth="8"
                        strokeDasharray={`${slaReport.complianceRate * 2.64} 264`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-3xl font-bold">{slaReport.complianceRate}%</span>
                      <span className="text-xs text-muted-foreground">Compliant</span>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-4 text-xs">
                    <span className="text-muted-foreground">Total: {slaReport.total}</span>
                    <span className="text-emerald-400">Met: {slaReport.compliant}</span>
                    <span className="text-red-400">Breached: {slaReport.breached}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Card className="shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Score Distribution</CardTitle>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => downloadXLSX(scoreDistribution, "score-distribution")}>
                <Download className="h-3.5 w-3.5" />
              </Button>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={scoreDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {scoreDistribution.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
