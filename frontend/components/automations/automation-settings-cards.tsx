"use client";

import Link from "next/link";
import { format } from "date-fns";
import { Pencil, History, Building2 } from "lucide-react";
import { Trash2Icon } from "@animateicons/react/lucide";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { TruncatedText } from "@/components/ui/truncated-text";
import { AnimatedIconButton } from "@/components/ui/animated-icon-button";
import type { AutomationRule } from "@/hooks/api/automations";
import { TRIGGER_META } from "./automation-trigger-data";
import { ACTION_TYPES } from "./automation-meta";

function triggerLabel(value: AutomationRule["triggerEvent"]) {
  return TRIGGER_META.find((t) => t.value === value)?.label ?? value;
}

function actionSummary(actions: AutomationRule["actions"]) {
  if (actions.length === 0) return "No actions";
  return actions
    .map((a) => ACTION_TYPES.find((t) => t.value === a.type)?.label ?? a.type)
    .join(", ");
}

export function ModuleDisabledCard({ name }: { name: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[24dvh] gap-4 py-12">
      <Building2 className="h-9 w-9 text-muted-foreground" />
      <div className="text-center">
        <p className="font-semibold text-sm text-foreground">{name} module not enabled</p>
        <p className="text-xs text-muted-foreground mt-1">
          Enable this module in settings to manage its automation rules.
        </p>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/settings/modules">Manage Modules</Link>
      </Button>
    </div>
  );
}

export function AutomationCard({
  rule,
  onEdit,
  onDelete,
  onViewRuns,
  onToggle,
  isToggling,
}: {
  rule: AutomationRule;
  onEdit: () => void;
  onDelete: () => void;
  onViewRuns: () => void;
  onToggle: (next: boolean) => void;
  isToggling: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <TruncatedText text={rule.name} className="font-medium text-sm" />
              <Badge variant="secondary" className="text-micro">
                {triggerLabel(rule.triggerEvent)}
              </Badge>
              {!rule.isEnabled && (
                <Badge variant="outline" className="text-micro">
                  Disabled
                </Badge>
              )}
            </div>
            {rule.description && (
              <TruncatedText text={rule.description} className="text-xs text-muted-foreground mt-0.5" />
            )}
            <p className="text-xs text-muted-foreground mt-1.5">
              <span className="font-medium text-foreground/70">Actions:</span>{" "}
              {actionSummary(rule.actions)}
            </p>
            <div className="flex items-center gap-3 mt-2 text-dense text-muted-foreground">
              <span>{rule.runCount} runs</span>
              <span>
                {rule.lastRunAt
                  ? `Last run ${format(new Date(rule.lastRunAt), "MMM d, HH:mm")}`
                  : "Never run"}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <Switch
              checked={rule.isEnabled}
              disabled={isToggling}
              onCheckedChange={onToggle}
              aria-label="Toggle automation"
            />
            <div className="flex items-center gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onViewRuns}>
                <History className="h-3.5 w-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" aria-label="Edit automation" onClick={onEdit}>
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <AnimatedIconButton
                icon={Trash2Icon}
                iconSize={14}
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label="Delete automation"
                onClick={onDelete}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function AutomationCardItem({
  rule,
  togglingId,
  onToggle,
  onEdit,
  onDelete,
  onViewRuns,
}: {
  rule: AutomationRule;
  togglingId: number | null;
  onToggle: (rule: AutomationRule, next: boolean) => void;
  onEdit: (rule: AutomationRule) => void;
  onDelete: (rule: AutomationRule) => void;
  onViewRuns: (rule: AutomationRule) => void;
}) {
  function handleToggle(next: boolean) {
    onToggle(rule, next);
  }
  function handleEdit() {
    onEdit(rule);
  }
  function handleDelete() {
    onDelete(rule);
  }
  function handleViewRuns() {
    onViewRuns(rule);
  }

  return (
    <AutomationCard
      rule={rule}
      isToggling={togglingId === rule.id}
      onToggle={handleToggle}
      onEdit={handleEdit}
      onDelete={handleDelete}
      onViewRuns={handleViewRuns}
    />
  );
}
