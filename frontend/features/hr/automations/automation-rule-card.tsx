"use client";

import { format } from "date-fns";
import { Pencil, History } from "lucide-react";
import { PlayIcon, Trash2Icon } from "@animateicons/react/lucide";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { TooltipIconButton } from "@/components/ui/tooltip-icon-button";
import { TruncatedText } from "@/components/ui/truncated-text";
import type { HrAutomationRule } from "@/types/hr/automations";

interface AutomationRuleCardProps {
  rule: HrAutomationRule;
  onEdit: () => void;
  onDelete: () => void;
  onViewRuns: () => void;
  onTest: () => void;
  onToggle: (next: boolean) => void;
  isToggling: boolean;
  canManage: boolean;
}

export function AutomationRuleCard({
  rule,
  onEdit,
  onDelete,
  onViewRuns,
  onTest,
  onToggle,
  isToggling,
  canManage,
}: AutomationRuleCardProps) {
  function handleToggleChange(next: boolean) {
    onToggle(next);
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-x-auto scrollbar-hide [&>*]:shrink-0">
              <TruncatedText text={rule.name} className="font-medium text-sm" />
              <Badge variant="secondary" className="text-micro">{rule.triggerEvent}</Badge>
              {!rule.isEnabled && <Badge variant="outline" className="text-micro">Disabled</Badge>}
            </div>
            {rule.description && (
              <TruncatedText text={rule.description} className="text-xs text-muted-foreground mt-0.5" />
            )}
            <div className="flex items-center gap-4 mt-2 text-dense text-muted-foreground">
              <span>{rule.conditions.length} condition{rule.conditions.length !== 1 ? "s" : ""}</span>
              <span>{rule.actions.length} action{rule.actions.length !== 1 ? "s" : ""}</span>
              <span>{rule.runCount} run{rule.runCount !== 1 ? "s" : ""}</span>
              <span>{rule.lastRunAt ? `Last: ${format(new Date(rule.lastRunAt), "MMM d, HH:mm")}` : "Never run"}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Switch
              checked={rule.isEnabled}
              disabled={isToggling || !canManage}
              onCheckedChange={handleToggleChange}
              aria-label="Toggle automation"
            />
            <div className="flex items-center gap-1">
              <TooltipIconButton label="View Runs" className="w-7" onClick={onViewRuns}>
                <History className="h-3.5 w-3.5" />
              </TooltipIconButton>
              {canManage && (
                <>
                  <TooltipIconButton icon={PlayIcon} iconSize={14} label="Dry-Run Test" className="w-7" onClick={onTest} />
                  <TooltipIconButton label="Edit" className="w-7" onClick={onEdit}>
                    <Pencil className="h-3.5 w-3.5" />
                  </TooltipIconButton>
                  <TooltipIconButton
                    icon={Trash2Icon}
                    iconSize={14}
                    label="Delete"
                    className="w-7 text-destructive hover:text-destructive"
                    onClick={onDelete}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
