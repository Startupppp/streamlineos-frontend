"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Phone, Mail, Video, MessageCircle, Activity, Users, Trophy } from "lucide-react";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { EmptyState } from "@/components/ui/empty-state";
import { apiClient } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

interface RepActivity {
  userId: string;
  name: string | null;
  role: string | null;
  calls: number;
  emails: number;
  meetings: number;
  whatsapp: number;
  other: number;
  total: number;
  dealActivities: number;
}

interface ActivityDashboardResponse {
  period: "week" | "month";
  startDate: string;
  endDate: string;
  reps: RepActivity[];
  totals: Omit<RepActivity, "userId" | "name" | "role">;
  trend: { date: string; count: number }[];
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

function useSalesActivityDashboard(period: "week" | "month") {
  return useQuery<ActivityDashboardResponse>({
    queryKey: ["sales", "activity-dashboard", period],
    queryFn: () =>
      apiClient.get<ActivityDashboardResponse>("/sales/activity-dashboard", {
        period,
      }),
    refetchInterval: 300_000,
  });
}

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatTileProps {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}

function StatTile({ label, value, icon: Icon, colorClass }: StatTileProps) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg shrink-0", colorClass)}>
            <Icon className="h-5 w-5 text-white" aria-hidden="true" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SalesActivityPage() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const { data, isLoading } = useSalesActivityDashboard(period);

  const periodToggle = (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        aria-pressed={period === "week"}
        className={cn(period === "week" && "bg-primary text-primary-foreground hover:bg-primary/90")}
        onClick={() => setPeriod("week")}
      >
        This Week
      </Button>
      <Button
        variant="outline"
        size="sm"
        aria-pressed={period === "month"}
        className={cn(period === "month" && "bg-primary text-primary-foreground hover:bg-primary/90")}
        onClick={() => setPeriod("month")}
      >
        This Month
      </Button>
    </div>
  );

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <PageWrapper
        title="Sales Activity"
        subtitle="Team activity metrics and call/meeting tracking"
        actions={periodToggle}
      >
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                  <Skeleton className="h-10 w-10 rounded-lg" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="mt-4">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[240px] w-full" />
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  const totals = data?.totals;
  const reps = data?.reps ?? [];

  // ── Empty state ────────────────────────────────────────────────────────────
  if (!isLoading && reps.length === 0) {
    return (
      <PageWrapper
        title="Sales Activity"
        subtitle="Team activity metrics and call/meeting tracking"
        actions={periodToggle}
      >
        <EmptyState
          icon={Activity}
          title="No activity recorded"
          description={`No sales activities were logged ${period === "week" ? "this week" : "this month"}.`}
        />
      </PageWrapper>
    );
  }

  const topPerformerIdx = reps.findIndex(
    (r) => r.total + r.dealActivities === Math.max(...reps.map((x) => x.total + x.dealActivities)),
  );

  return (
    <PageWrapper
      title="Sales Activity"
      subtitle="Team activity metrics and call/meeting tracking"
      actions={periodToggle}
    >
      {/* ── Stat tiles ──────────────────────────────────────────────────────── */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <StatTile
          label="Total Activities"
          value={(totals?.total ?? 0) + (totals?.dealActivities ?? 0)}
          icon={Activity}
          colorClass="bg-primary"
        />
        <StatTile
          label="Calls Made"
          value={totals?.calls ?? 0}
          icon={Phone}
          colorClass="bg-blue-500"
        />
        <StatTile
          label="Emails Sent"
          value={totals?.emails ?? 0}
          icon={Mail}
          colorClass="bg-amber-500"
        />
        <StatTile
          label="Meetings Held"
          value={totals?.meetings ?? 0}
          icon={Video}
          colorClass="bg-purple-500"
        />
        <StatTile
          label="WhatsApp Messages"
          value={totals?.whatsapp ?? 0}
          icon={MessageCircle}
          colorClass="bg-emerald-500"
        />
      </div>

      {/* ── Rep breakdown table ─────────────────────────────────────────────── */}
      <Card className="mt-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-gold" aria-hidden="true" />
            Rep Activity Breakdown
            {data && (
              <span className="ml-auto text-xs font-normal text-muted-foreground">
                {data.startDate} – {data.endDate}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="w-full" type="auto">
            <div className="min-w-[760px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Rep Name</TableHead>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Phone className="h-3.5 w-3.5 text-blue-500" aria-hidden="true" />
                        Calls
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Mail className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                        Emails
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <Video className="h-3.5 w-3.5 text-purple-500" aria-hidden="true" />
                        Meetings
                      </span>
                    </TableHead>
                    <TableHead className="text-right">
                      <span className="flex items-center justify-end gap-1">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" />
                        WhatsApp
                      </span>
                    </TableHead>
                    <TableHead className="text-right">Other</TableHead>
                    <TableHead className="text-right">Deal Activities</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reps.map((rep, idx) => {
                    const grandTotal = rep.total + rep.dealActivities;
                    const isTop = idx === topPerformerIdx && grandTotal > 0;
                    return (
                      <TableRow key={rep.userId} className={cn(isTop && "bg-amber-50/40 dark:bg-amber-900/10")}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-foreground">
                              {rep.name ?? "Unknown"}
                            </span>
                            {isTop && (
                              <Badge
                                variant="secondary"
                                className="flex items-center gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 text-[10px] px-1.5 py-0"
                              >
                                <Trophy className="h-3 w-3" aria-hidden="true" />
                                Top Performer
                              </Badge>
                            )}
                            {rep.role && (
                              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                                {rep.role}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{rep.calls}</TableCell>
                        <TableCell className="text-right tabular-nums">{rep.emails}</TableCell>
                        <TableCell className="text-right tabular-nums">{rep.meetings}</TableCell>
                        <TableCell className="text-right tabular-nums">{rep.whatsapp}</TableCell>
                        <TableCell className="text-right tabular-nums">{rep.other}</TableCell>
                        <TableCell className="text-right tabular-nums">{rep.dealActivities}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">{grandTotal}</TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Totals row */}
                  {totals && (
                    <TableRow className="border-t-2 border-border bg-muted/30 font-semibold">
                      <TableCell>Totals</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.calls}</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.emails}</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.meetings}</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.whatsapp}</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.other}</TableCell>
                      <TableCell className="text-right tabular-nums">{totals.dealActivities}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {totals.total + totals.dealActivities}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
