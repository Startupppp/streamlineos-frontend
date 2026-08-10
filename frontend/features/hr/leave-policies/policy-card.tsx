"use client";

import { motion } from "framer-motion";
import { Pencil, Clock, Calendar } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import type { LeavePolicy } from "@/hooks/api/hr/leave-policies";
import { ACCRUAL_LABELS } from "@/features/hr/leave-policies/policy-schema";

interface PolicyCardProps {
  policy: LeavePolicy;
  index: number;
  canManage: boolean;
  leaveTypeName?: string;
  onEdit: (policy: LeavePolicy) => void;
  onDelete: (id: number) => void;
}

export function PolicyCard({
  policy,
  index,
  canManage,
  leaveTypeName,
  onEdit,
  onDelete,
}: PolicyCardProps) {
  function handleEditClick() {
    onEdit(policy);
  }
  function handleDeleteClick() {
    onDelete(policy.id);
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut", delay: index * 0.08 }}
      className="bg-card border border-border rounded-lg shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow duration-200"
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-foreground">{policy.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {leaveTypeName ?? "Unknown leave type"}
          </p>
        </div>
        {canManage && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="w-7"
              aria-label={`Edit ${policy.name}`}
              onClick={handleEditClick}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <AnimatedIconButton
              icon={Trash2Icon}
              variant="ghost"
              size="icon"
              className="w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
              iconSize={14}
              aria-label={`Delete ${policy.name}`}
              onClick={handleDeleteClick}
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-foreground">
        <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
        <span>
          {policy.accrualRate} {ACCRUAL_LABELS[policy.accrualType] ?? "days"}
        </span>
      </div>

      {Number(policy.carryForwardDays) > 0 && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
          <span>Carry forward: {policy.carryForwardDays} days</span>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 mt-1">
        {policy.encashable && (
          <Badge
            variant="secondary"
            className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30"
          >
            Encashable
          </Badge>
        )}
        {policy.probationRestricted && (
          <Badge
            variant="secondary"
            className="text-xs bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30"
          >
            Probation Restricted
          </Badge>
        )}
        <Badge variant="outline" className="text-xs">
          {policy.accrualType}
        </Badge>
      </div>

      <p className="text-xs text-muted-foreground mt-auto pt-2 border-t border-border">
        Effective from {policy.effectiveFrom}
      </p>
    </motion.div>
  );
}
