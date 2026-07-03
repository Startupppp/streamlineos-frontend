"use client";

import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { useClientOpportunities } from "@/hooks/api/crm/clients";
import { formatAmount, formatDate } from "./utils";
import type { ClientOpportunity } from "@/types/crm";

const OPP_STAGE_LABELS: Record<ClientOpportunity["stage"], string> = {
  identified: "Identified",
  proposed: "Proposed",
  negotiating: "Negotiating",
  won: "Won",
  lost: "Lost",
};

const OPP_STAGE_BADGE_CLASSES: Record<ClientOpportunity["stage"], string> = {
  identified: "bg-blue-50 text-blue-700 border-blue-200",
  proposed: "bg-amber-50 text-amber-700 border-amber-200",
  negotiating: "bg-slate-100 text-slate-700 border-slate-200",
  won: "bg-emerald-50 text-emerald-700 border-emerald-200",
  lost: "bg-red-50 text-red-700 border-red-200",
};

export function ClientOpportunitiesTab({ clientId }: { clientId: number }) {
  const { data, isLoading } = useClientOpportunities(clientId);

  if (isLoading) {
    return (
      <div className="space-y-2 py-2">
        {[1, 2].map((i) => (
          <div key={i} className="h-12 rounded-md bg-muted/40 animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data?.length) {
    return (
      <EmptyState
        title="No opportunities"
        description="Upsell and cross-sell opportunities will appear here."
        compact
        className="py-10"
      />
    );
  }

  return (
    <div className="border border-border rounded-md overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted/80">
          <tr className="border-b border-border">
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Title
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Type
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Stage
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Value
            </th>
            <th className="text-left px-3 py-2 text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
              Expected Close
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((opp: ClientOpportunity) => (
            <tr
              key={opp.id}
              className="border-b border-border/50 last:border-0 h-8 hover:bg-muted/30"
            >
              <td className="px-3 py-1.5 text-[11px] font-medium">{opp.title}</td>
              <td className="px-3 py-1.5">
                <Badge
                  variant="outline"
                  className="text-[9px] px-1.5 py-0 h-4 bg-slate-100 text-slate-700 border-slate-200 capitalize"
                >
                  {opp.type === "cross_sell" ? "Cross-sell" : "Upsell"}
                </Badge>
              </td>
              <td className="px-3 py-1.5">
                <Badge
                  variant="outline"
                  className={cn("text-[9px] px-1.5 py-0 h-4", OPP_STAGE_BADGE_CLASSES[opp.stage])}
                >
                  {OPP_STAGE_LABELS[opp.stage]}
                </Badge>
              </td>
              <td className="px-3 py-1.5 text-[11px] tabular-nums">
                {formatAmount(opp.value)}
              </td>
              <td className="px-3 py-1.5 text-[11px] text-muted-foreground">
                {formatDate(opp.expectedCloseDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
