"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Building2, BarChart3, Target,
  ArrowRight, UserPlus, Settings, DollarSign, AlertTriangle,
  FileText, Briefcase,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard } from "@/components/ui/stat-card";
import { cn } from "@/lib/utils";
import { fadeUp, staggerContainer } from "@/lib/motion-variants";
import { formatINRCompact } from "@/lib/format-utils";
import { useLeadStats } from "@/lib/api/hooks/leads";
import { useDeals } from "@/lib/api/hooks/crm";
import { useContacts, useCrmOrganizations } from "@/lib/api/hooks/crm";
import { CrmPipelineMini } from "./_components/crm-pipeline-mini";
import { CrmRecentActivity } from "./_components/crm-recent-activity";

const NAV_CARDS = [
  { title: "Leads", description: "Pipeline tracking from capture to conversion", href: "/crm/leads", icon: UserPlus, color: "text-blue-400", bg: "bg-blue-500/10" },
  { title: "Deals", description: "Track deals from proposal to close", href: "/crm/deals", icon: Briefcase, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { title: "Contacts", description: "People linked to leads and organizations", href: "/crm/contacts", icon: Users, color: "text-purple-400", bg: "bg-purple-500/10" },
  { title: "Clients", description: "Post-conversion account management", href: "/crm/clients", icon: Building2, color: "text-amber-400", bg: "bg-amber-500/10" },
  { title: "Analytics", description: "Funnel, conversion trends, rep performance", href: "/crm/analytics", icon: BarChart3, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { title: "Reports", description: "Pipeline reports with Excel & PDF export", href: "/crm/reports", icon: FileText, color: "text-rose-400", bg: "bg-rose-500/10" },
  { title: "Targets", description: "Track daily goals and team leaderboard", href: "/crm/targets", icon: Target, color: "text-gold", bg: "bg-gold/10" },
  { title: "Settings", description: "Scoring, assignment, SLA, email templates", href: "/crm/settings/scoring-rules", icon: Settings, color: "text-slate-400", bg: "bg-slate-500/10" },
] as const;

export default function CrmHubPage() {
  const { data: leadStats, isLoading: statsLoading } = useLeadStats();
  const { data: allDeals, isLoading: dealsLoading } = useDeals();
  const { data: contactsData, isLoading: contactsLoading } = useContacts({ limit: 1 });
  const { data: orgsData, isLoading: orgsLoading } = useCrmOrganizations({ limit: 1 });

  const isLoading = statsLoading || dealsLoading || contactsLoading || orgsLoading;

  const dealStats = useMemo(() => {
    if (!allDeals) return { active: 0, pipelineValue: 0, wonValue: 0 };
    const active = allDeals.filter(d => d.stage !== "WON" && d.stage !== "LOST");
    return {
      active: active.length,
      pipelineValue: active.reduce((s, d) => s + Number(d.value || 0), 0),
      wonValue: allDeals.filter(d => d.stage === "WON").reduce((s, d) => s + Number(d.value || 0), 0),
    };
  }, [allDeals]);

  if (isLoading) {
    return (
      <PageWrapper title="CRM" subtitle="Customer Relationship Management hub">
        <div className="space-y-6">
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-10" />)}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="CRM" subtitle="Customer Relationship Management hub">
      <motion.div className="space-y-6 pb-6" variants={staggerContainer} initial="hidden" animate="visible">
        {/* Row 1: Primary Stats */}
        <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4">
          <StatCard label="Total Leads" value={leadStats?.total ?? 0} icon={Target} index={0} />
          <StatCard label="Active Deals" value={dealStats.active} icon={TrendingUp} index={1} />
          <StatCard label="Pipeline Value" value={formatINRCompact(dealStats.pipelineValue)} icon={DollarSign} index={2} />
          <StatCard label="Conversion Rate" value={`${leadStats?.conversionRate ?? 0}%`} icon={BarChart3} index={3} />
        </motion.div>

        {/* Row 2: Quick Metrics Strip */}
        {leadStats && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-6 flex-wrap text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                    <span className="text-muted-foreground">Unassigned</span>
                    <span className="font-semibold text-red-400">{leadStats.unassigned}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">New This Month</span>
                    <span className="ml-2 font-semibold">{leadStats.thisMonth}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pipeline Value</span>
                    <span className="ml-2 font-semibold text-gold">{formatINRCompact(leadStats.totalPotentialValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Won Value</span>
                    <span className="ml-2 font-semibold text-emerald-400">{formatINRCompact(dealStats.wonValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Contacts</span>
                    <span className="ml-2 font-semibold">{contactsData?.total ?? 0}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Organizations</span>
                    <span className="ml-2 font-semibold">{orgsData?.totalCount ?? 0}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Row 3: Pipeline Funnel + Recent Activity */}
        {leadStats && (
          <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2">
            <CrmPipelineMini byStatus={leadStats.byStatus} total={leadStats.total} />
            <CrmRecentActivity deals={allDeals ?? []} />
          </motion.div>
        )}

        {/* Row 4: Navigation Cards */}
        <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {NAV_CARDS.map(card => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full shadow-sm hover:shadow-md transition-all hover:border-gold/40 cursor-pointer group">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", card.bg)}>
                      <card.icon className={cn("h-4 w-4", card.color)} />
                    </div>
                    <CardTitle className="text-sm flex items-center gap-2">
                      {card.title}
                      <ArrowRight className="h-3.5 w-3.5 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-gold" />
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <CardDescription className="text-xs">{card.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>
      </motion.div>
    </PageWrapper>
  );
}
