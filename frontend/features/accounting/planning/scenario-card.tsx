"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Scenario } from "@/types/accounting/planning";

const KIND_CLASSES: Record<string, string> = {
  CONSERVATIVE: "bg-primary/5 text-foreground border-primary/20",
  EXPECTED: "bg-status-success-surface text-status-success-ink border-status-success-rule",
  AGGRESSIVE: "bg-status-warning-surface text-status-warning-ink border-status-warning-rule",
  CUSTOM: "bg-muted text-muted-foreground border-border",
};

interface ScenarioCardProps {
  scenario: Scenario;
  canManage: boolean;
  onEdit: (s: Scenario) => void;
  onDelete: (s: Scenario) => void;
}

export function ScenarioCard({ scenario, canManage, onEdit, onDelete }: ScenarioCardProps) {
  function handleEdit(): void {
    onEdit(scenario);
  }
  function handleDelete(): void {
    onDelete(scenario);
  }
  return (
    <Card className="bg-card border border-border rounded-xl shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="font-medium text-sm">{scenario.name}</p>
            {scenario.isDefault && (
              <span className="text-micro text-muted-foreground">Default</span>
            )}
          </div>
          <Badge variant="outline" className={KIND_CLASSES[scenario.kind] ?? ""}>
            {scenario.kind}
          </Badge>
        </div>
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Collection rate: {scenario.assumptions.collectionRatePct}%</p>
          <p>Pay delay: {scenario.assumptions.payDelayDays} days</p>
          <p>Revenue growth: {scenario.assumptions.revenueGrowthPct}%</p>
          <p>Planned spend items: {scenario.assumptions.plannedSpend.length}</p>
        </div>
        {canManage && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-border/50">
            <Button variant="outline" size="sm" className="flex-1 h-7 text-xs" onClick={handleEdit}>
              Edit
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-destructive hover:text-destructive"
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
