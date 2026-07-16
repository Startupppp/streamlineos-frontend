"use client";

import { TrendingUp, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EmptyActivityIllustration } from "@/components/illustrations";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
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

export function CrmRecentActivity({ deals }: CrmRecentActivityProps) {
  const recentDeals = [...deals]
    .sort((a, b) => new Date(b.updatedAt ?? b.createdAt ?? 0).getTime() - new Date(a.updatedAt ?? a.createdAt ?? 0).getTime())
    .slice(0, 6);

  return (
    <Card className="shadow-sm h-full">
      <CardHeader className="pb-2 px-3 pt-3">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3">
        {recentDeals.length === 0 ? (
          <EmptyState
            illustration={<EmptyActivityIllustration className="h-20 w-20" />}
            title="No recent activity"
            description="Deal updates will appear here."
            compact
          />
        ) : (
          <div className="space-y-2">
            {recentDeals.map((deal) => {
              const isWon = deal.stage === "WON";
              const isLost = deal.stage === "LOST";
              const updatedDate = deal.updatedAt ?? deal.createdAt;
              return (
                <div key={deal.id} className="flex items-start gap-2">
                  <div className={cn(
                    "h-6 w-6 rounded flex items-center justify-center shrink-0 mt-0.5",
                    isWon ? "bg-emerald-500/15 text-emerald-400" :
                    isLost ? "bg-red-500/15 text-red-400" :
                    "bg-primary/10 text-primary",
                  )}>
                    {isWon ? <TrendingUp className="h-3 w-3" /> : <IndianRupee className="h-3 w-3" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <TruncatedText text={deal.name} className="text-[11px] font-medium" />
                    <p className="text-[10px] text-muted-foreground">
                      {STAGE_LABELS[deal.stage] ?? deal.stage}
                      {deal.assignedTo?.name && ` · ${deal.assignedTo.name}`}
                    </p>
                  </div>
                  <span className="text-[9px] text-muted-foreground shrink-0 tabular-nums">
                    {updatedDate
                      ? formatDistanceToNow(new Date(updatedDate), { addSuffix: false })
                      : "—"}
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
