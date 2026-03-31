"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Users, Megaphone, BarChart3, Share2 } from "lucide-react";
import { api } from "@/trpc/react";
import { cn } from "@/lib/utils";

export default function DigitalMarketingPage() {
  const { data: stats } = api.dmLeads.getStats.useQuery();

  const modules = [
    { title: "DM Leads", description: "Capture and manage leads from digital campaigns", href: "/digital-marketing/leads", icon: Users, count: stats?.total ?? 0, color: "text-blue-400" },
    { title: "Campaigns", description: "Manage marketing campaigns and track ROI", href: "/digital-marketing/campaigns", icon: Megaphone, color: "text-purple-400" },
    { title: "Social Media", description: "Track social media metrics across platforms", href: "/digital-marketing/social", icon: Share2, color: "text-pink-400" },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Digital Marketing"
        description="Manage leads, campaigns, and social media tracking"
      />

      {/* Quick Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        {[
          { label: "Total DM Leads", value: stats?.total ?? 0, color: "text-blue-400" },
          { label: "Pending Review", value: stats?.pendingReview ?? 0, color: "text-amber-400" },
          { label: "Verified", value: stats?.verified ?? 0, color: "text-emerald-400" },
          { label: "Imported", value: stats?.imported ?? 0, color: "text-purple-400" },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <span className={cn("text-2xl font-bold tabular-nums", s.color)}>{s.value}</span>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Module Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map(m => (
          <Link key={m.title} href={m.href}>
            <Card className="hover:border-[#bd882c]/30 transition-colors cursor-pointer h-full">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                    <m.icon className={cn("h-5 w-5", m.color)} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{m.title}</h3>
                    {m.count !== undefined && (
                      <span className="text-xs text-muted-foreground">{m.count} total</span>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{m.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Platform Breakdown */}
      {stats?.byPlatform && stats.byPlatform.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold mb-4">Leads by Platform</h3>
            <div className="space-y-2">
              {stats.byPlatform.map(p => (
                <div key={p.platform} className="flex items-center justify-between">
                  <span className="text-sm capitalize">{p.platform.replace("_", " ")}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#bd882c] rounded-full"
                        style={{ width: `${Math.min(100, (p.count / (stats.total || 1)) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono w-8 text-right">{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
