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

const OPP_STAGE_COLORS: Record<ClientOpportunity["stage"], string> = {
  identified: "bg-blue-500/10 text-blue-600 border-0",
  proposed: "bg-amber-500/10 text-amber-600 border-0",
  negotiating: "bg-muted text-foreground border-0",
  won: "bg-emerald-500/10 text-emerald-600 border-0",
  lost: "bg-red-500/10 text-red-600 border-0",
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
                <Badge className="text-[10px] border-0 bg-slate-100 text-slate-600 capitalize">
                  {opp.type === "cross_sell" ? "Cross-sell" : "Upsell"}
                </Badge>
              </td>
              <td className="px-3 py-1.5">
                <Badge className={cn("text-[10px]", OPP_STAGE_COLORS[opp.stage])}>
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
