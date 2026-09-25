"use client";

import { Shield, Heart, Umbrella, PiggyBank, Smile, Star, Package } from "lucide-react";
import { useOrgDisplay } from "@/hooks/api/org-display";
import { formatMoney } from "@/lib/format-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import type { BenefitPlan } from "@/hooks/api/hr";
import { TruncatedText } from "@/components/ui/truncated-text";
import { cn } from "@/lib/utils";

const CATEGORY_META: Record<
  BenefitPlan["category"],
  { label: string; icon: React.ReactNode; className: string }
> = {
  health: { label: "Health", icon: <Heart className="h-4 w-4" />, className: "text-status-danger-ink bg-status-danger-surface border-status-danger-rule" },
  life: { label: "Life", icon: <Shield className="h-4 w-4" />, className: "text-status-info-ink bg-status-info-surface border-status-info-rule" },
  accident: { label: "Accident", icon: <Umbrella className="h-4 w-4" />, className: "text-status-warning-ink bg-status-warning-surface border-status-warning-rule" },
  retirement: { label: "Retirement", icon: <PiggyBank className="h-4 w-4" />, className: "text-status-success-ink bg-status-success-surface border-status-success-rule" },
  wellness: { label: "Wellness", icon: <Smile className="h-4 w-4" />, className: "text-status-info-ink bg-status-info-surface border-status-info-rule" },
  perk: { label: "Perk", icon: <Star className="h-4 w-4" />, className: "text-status-warning-ink bg-status-warning-surface border-status-warning-rule" },
  other: { label: "Other", icon: <Package className="h-4 w-4" />, className: "text-muted-foreground bg-muted border-border" },
};

interface Props {
  plan: BenefitPlan;
  enrolled?: boolean;
  onEnroll?: () => void;
  onWaive?: () => void;
  onEdit?: () => void;
  isAdmin?: boolean;
  isPending?: boolean;
}

export function BenefitPlanCard({ plan, enrolled, onEnroll, onWaive, onEdit, isAdmin, isPending }: Props) {
  const meta = CATEGORY_META[plan.category];
  const money = useOrgDisplay();

  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={cn("h-9 w-9 rounded-lg border flex items-center justify-center shrink-0", meta.className)}>
              {meta.icon}
            </div>
            <div className="min-w-0">
              <TruncatedText text={plan.name} className="text-sm font-semibold text-foreground" />
              {plan.provider && (
                <TruncatedText text={plan.provider} className="text-xs text-muted-foreground" />
              )}
            </div>
          </div>
          <Badge variant="outline" className="text-micro shrink-0">
            {meta.label}
          </Badge>
        </div>

        {plan.description && (
          <TruncatedText text={plan.description} lines={2} className="text-xs text-muted-foreground mb-3" />
        )}

        <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
          {plan.premiumCents != null && (
            <span className="tabular-nums">{formatMoney(plan.premiumCents / 100, money)}/mo</span>
          )}
          {plan.employerContributionPct > 0 && (
            <span className="text-status-success-ink">{plan.employerContributionPct}% employer</span>
          )}
          <span>From {plan.effectiveFrom}</span>
        </div>

        <div className="flex items-center gap-2">
          {!isAdmin && onEnroll && !enrolled && (
            <LoadingButton size="sm" className="text-xs" onClick={onEnroll} isPending={isPending}>
              Enroll
            </LoadingButton>
          )}
          {!isAdmin && onWaive && enrolled && (
            <LoadingButton size="sm" variant="outline" className="text-xs" onClick={onWaive} isPending={isPending}>
              Waive
            </LoadingButton>
          )}
          {enrolled && !isAdmin && (
            <Badge className="bg-status-success-surface text-status-success-ink border-status-success-rule text-micro">Enrolled</Badge>
          )}
          {isAdmin && onEdit && (
            <Button size="sm" variant="outline" className="text-xs" onClick={onEdit}>
              Edit
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
