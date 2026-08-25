"use client";

import { Shield, Heart, Umbrella, PiggyBank, Smile, Star, Package } from "lucide-react";
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
  health: { label: "Health", icon: <Heart className="h-4 w-4" />, className: "text-rose-600 bg-rose-50 border-rose-100 dark:text-rose-300 dark:bg-rose-500/10 dark:border-rose-500/30" },
  life: { label: "Life", icon: <Shield className="h-4 w-4" />, className: "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/30" },
  accident: { label: "Accident", icon: <Umbrella className="h-4 w-4" />, className: "text-orange-600 bg-orange-50 border-orange-100 dark:text-orange-300 dark:bg-orange-500/10 dark:border-orange-500/30" },
  retirement: { label: "Retirement", icon: <PiggyBank className="h-4 w-4" />, className: "text-emerald-600 bg-emerald-50 border-emerald-100 dark:text-emerald-300 dark:bg-emerald-500/10 dark:border-emerald-500/30" },
  wellness: { label: "Wellness", icon: <Smile className="h-4 w-4" />, className: "text-blue-600 bg-blue-50 border-blue-100 dark:text-blue-300 dark:bg-blue-500/10 dark:border-blue-500/30" },
  perk: { label: "Perk", icon: <Star className="h-4 w-4" />, className: "text-amber-600 bg-amber-50 border-amber-100 dark:text-amber-300 dark:bg-amber-500/10 dark:border-amber-500/30" },
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
            <span>₹{(plan.premiumCents / 100).toLocaleString("en-IN")}/mo</span>
          )}
          {plan.employerContributionPct > 0 && (
            <span className="text-emerald-600 dark:text-emerald-300">{plan.employerContributionPct}% employer</span>
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
            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-micro dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30">Enrolled</Badge>
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
