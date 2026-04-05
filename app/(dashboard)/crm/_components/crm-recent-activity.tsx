"use client";

import { Phone, Mail, MessageSquare, Users, TrendingUp, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Deal } from "@/types/crm";

interface CrmRecentActivityProps {
  deals: Deal[];
}

const STAGE_LABELS: Record<string, string> = {
  WON: "Deal won",
  LOST: "Deal lost",
  PROPOSAL: "Proposal sent",
  NEGOTIATION: "In negotiation",
  CONTACTED: "Contact made",
};

function timeAgo(date: string | Date) {
  const now = new Date();
  const d = new Date(date);
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function CrmRecentActivity({ deals }: CrmRecentActivityProps) {
  // Show the 5 most recently updated deals as activity
  const recentDeals = [...(deals || [])]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    .slice(0, 5);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {recentDeals.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {recentDeals.map((deal) => {
              const isWon = deal.stage === "WON";
              const isLost = deal.stage === "LOST";
              return (
                <div key={deal.id} className="flex items-start gap-3">
                  <div className={cn(
                    "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                    isWon ? "bg-emerald-500/15 text-emerald-400" :
                    isLost ? "bg-red-500/15 text-red-400" :
                    "bg-gold/10 text-gold",
                  )}>
                    {isWon ? <TrendingUp className="h-4 w-4" /> :
                     isLost ? <DollarSign className="h-4 w-4" /> :
                     <DollarSign className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{deal.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {STAGE_LABELS[deal.stage] ?? deal.stage}
                      {deal.assignedTo?.name && ` · ${deal.assignedTo.name}`}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {timeAgo(deal.updatedAt ?? deal.createdAt ?? new Date().toISOString())}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
