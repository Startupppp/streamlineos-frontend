"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users, TrendingUp, Building2, BarChart3, Target,
  ArrowRight, Phone, Mail, UserPlus, Settings,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { cn } from "@/lib/utils";
import { fadeUp } from "@/lib/motion-variants";
import { useLeadStats } from "@/lib/api/hooks/leads";
import { useDeals } from "@/lib/api/hooks/crm";
import { useContacts, useCrmOrganizations } from "@/lib/api/hooks/crm";

function formatINR(v: number) {
  if (v >= 10000000) return `₹${(v / 10000000).toFixed(1)}Cr`;
  if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v.toLocaleString("en-IN")}`;
}

const NAV_CARDS = [
  {
    title: "Leads",
    description: "Manage your sales pipeline and track lead progress",
    href: "/crm/leads",
    icon: UserPlus,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  {
    title: "Deals",
    description: "Track deals across stages from lead to close",
    href: "/crm/deals",
    icon: TrendingUp,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    title: "Contacts",
    description: "People directory linked to leads and organizations",
    href: "/crm/contacts",
    icon: Users,
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
  {
    title: "Organizations",
    description: "Company accounts with health scores and contacts",
    href: "/crm/organizations",
    icon: Building2,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
  },
  {
    title: "Analytics",
    description: "Pipeline funnel, conversion trends, and rep performance",
    href: "/crm/analytics",
    icon: BarChart3,
    color: "text-cyan-400",
    bg: "bg-cyan-500/10",
  },
  {
    title: "Settings",
    description: "Scoring rules, assignment rules, email templates, SLA",
    href: "/crm/settings/scoring-rules",
    icon: Settings,
    color: "text-rose-400",
    bg: "bg-rose-500/10",
  },
] as const;

export default function CrmHubPage() {
  const { data: leadStats, isLoading: statsLoading } = useLeadStats();
  const { data: allDeals, isLoading: dealsLoading } = useDeals();
  const { data: contactsData, isLoading: contactsLoading } = useContacts({ limit: 1 });
  const { data: orgsData, isLoading: orgsLoading } = useCrmOrganizations({ limit: 1 });

  const isLoading = statsLoading || dealsLoading || contactsLoading || orgsLoading;

  const quickStats = useMemo(() => {
    const dealsInPipeline = allDeals?.filter(d => d.stage !== "WON" && d.stage !== "LOST").length ?? 0;
    return [
      { label: "Total Leads", value: leadStats?.total ?? 0, icon: Target, color: "text-blue-400" },
      { label: "Deals in Pipeline", value: dealsInPipeline, icon: TrendingUp, color: "text-emerald-400" },
      { label: "Contacts", value: contactsData?.total ?? 0, icon: Phone, color: "text-purple-400" },
      { label: "Organizations", value: orgsData?.totalCount ?? 0, icon: Building2, color: "text-amber-400" },
    ];
  }, [leadStats, allDeals, contactsData, orgsData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    );
  }

  return (
    <PageWrapper title="CRM" subtitle="Customer Relationship Management hub">
      <div className="space-y-6">
        <motion.div variants={fadeUp} className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {quickStats.map((stat, i) => (
            <Card key={stat.label} className="shadow-sm" style={{ animation: `fade-up 0.4s ease-out ${i * 0.1}s both` }}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                  <span className="text-2xl font-bold tabular-nums">{stat.value}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </motion.div>

        {leadStats && (
          <motion.div variants={fadeUp}>
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-6 flex-wrap text-sm">
                  <div>
                    <span className="text-muted-foreground">Conversion Rate</span>
                    <span className="ml-2 font-semibold text-emerald-400">{leadStats.conversionRate}%</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Pipeline Value</span>
                    <span className="ml-2 font-semibold text-gold">{formatINR(leadStats.totalPotentialValue)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">New This Month</span>
                    <span className="ml-2 font-semibold">{leadStats.thisMonth}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Unassigned</span>
                    <span className="ml-2 font-semibold text-rose-400">{leadStats.unassigned}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div variants={fadeUp} className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {NAV_CARDS.map(card => (
            <Link key={card.href} href={card.href}>
              <Card className="h-full shadow-sm hover:shadow-md transition-all hover:border-gold/40 cursor-pointer group">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 rounded-lg flex items-center justify-center", card.bg)}>
                      <card.icon className={cn("h-5 w-5", card.color)} />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        {card.title}
                        <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0 text-gold" />
                      </CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{card.description}</CardDescription>
                </CardContent>
              </Card>
            </Link>
          ))}
        </motion.div>
      </div>
    </PageWrapper>
  );
}
