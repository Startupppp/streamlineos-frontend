"use client";

import Link from "next/link";
import { TrendingUp, DollarSign, Calendar, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useDealDetail } from "@/hooks/api/crm/deals";
import { formatCurrency } from "@/lib/format-utils";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";
import type { Contact } from "@/types/crm";

const STAGE_CONFIG: Record<string, { label: string; className: string }> = {
  LEAD: { label: "Lead", className: "bg-status-info-surface text-status-info-ink" },
  CONTACTED: { label: "Contacted", className: "bg-status-info-surface text-status-info-ink" },
  PROPOSAL: { label: "Proposal", className: "bg-status-info-surface text-status-info-ink" },
  NEGOTIATION: { label: "Negotiation", className: "bg-status-warning-surface text-status-warning-ink" },
  WON: { label: "Won", className: "bg-status-success-surface text-status-success-ink" },
  LOST: { label: "Lost", className: "bg-muted text-muted-foreground" },
};

interface ContactRelatedDealsProps {
  contact: Contact;
}

function DealRow({ dealId }: { dealId: number }) {
  const { data: deal, isLoading } = useDealDetail(dealId);

  if (isLoading) {
    return (
      <tr className="border-b border-border/50">
        <td className="px-4 py-3" colSpan={4}>
          <Skeleton className="h-4 w-full" />
        </td>
      </tr>
    );
  }

  if (!deal) return null;

  const stageConfig = STAGE_CONFIG[deal.stage] ?? STAGE_CONFIG.LEAD;

  return (
    <tr className="border-b border-border/50 last:border-0 hover:bg-accent/40 transition-colors">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="h-3 w-3 text-primary" />
          </div>
          <Link
            href={`/crm/deals/${deal.id}`}
            className="text-xs font-medium text-primary hover:underline max-w-[180px]"
          >
            <TruncatedText text={deal.name} />
          </Link>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <Badge
          className={cn("text-micro border-0 capitalize", stageConfig.className)}
        >
          {stageConfig.label}
        </Badge>
      </td>
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-1 text-xs text-foreground">
          <DollarSign className="h-3 w-3 text-muted-foreground" />
          {deal.value ? formatCurrency(parseFloat(deal.value)) : "—"}
        </div>
      </td>
      <td className="px-4 py-2.5">
        {deal.expectedCloseDate ? (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {new Date(deal.expectedCloseDate).toLocaleDateString()}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
    </tr>
  );
}

export function ContactRelatedDeals({ contact }: ContactRelatedDealsProps) {
  const hasLinkedDeal = contact.dealId != null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: 0.12 }}
    >
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-medium">Related Deals</CardTitle>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7" asChild>
            <Link href="/crm/deals">
              <Plus className="h-3 w-3" />
              New Deal
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {!hasLinkedDeal ? (
            <div className="px-4 py-6">
              <EmptyState
                title="No related deals"
                description="Link this contact to a deal to track opportunities."
                compact
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Deal</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Stage</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Value</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-muted-foreground">Close Date</th>
                  </tr>
                </thead>
                <tbody>
                  {contact.dealId && <DealRow dealId={contact.dealId} />}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
