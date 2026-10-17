"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { useUpdateCalendarWorkflowRule } from "@/hooks/api/calendar-workflows";
import type { CalendarWorkflowRule } from "@/hooks/api/calendar-workflows-schema";
import { CalendarWorkflowRuleDialog } from "./calendar-workflow-rule-dialog";

export function CalendarWorkflowRulesCard({ rules }: { rules: CalendarWorkflowRule[] }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const update = useUpdateCalendarWorkflowRule();

  async function setStatus(rule: CalendarWorkflowRule, active: boolean) {
    try {
      await update.mutateAsync({
        id: rule.id,
        expectedVersion: rule.version,
        input: { status: active ? "active" : "disabled" },
      });
      toast.success(active ? "Rule enabled" : "Rule disabled");
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  }

  return (
    <>
      <Card>
        <CardHeader className="grid-cols-[1fr_auto]">
          <div><CardTitle>Lifecycle rules</CardTitle><CardDescription>Effects are created once per aggregate version, rule, and action.</CardDescription></div>
          <Button size="sm" onClick={() => setDialogOpen(true)}><Plus className="size-4" />Add rule</Button>
        </CardHeader>
        <CardContent>
          {rules.length === 0 ? (
            <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">No rules yet. Add one to automate a Calendar lifecycle event.</div>
          ) : (
            <div className="divide-y rounded-lg border">
              {rules.map((rule) => (
                <div key={rule.id} className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2"><p className="font-medium">{rule.name}</p><Badge variant="outline">v{rule.version}</Badge></div>
                    <p className="text-xs text-muted-foreground">{rule.triggers.join(", ")} · {rule.actions.length} effect{rule.actions.length === 1 ? "" : "s"} · {rule.conditions.length} condition{rule.conditions.length === 1 ? "" : "s"}</p>
                    {rule.description ? <p className="text-sm text-muted-foreground">{rule.description}</p> : null}
                  </div>
                  <div className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{rule.status === "active" ? "Active" : "Disabled"}</span><Switch aria-label={`Enable ${rule.name}`} checked={rule.status === "active"} disabled={update.isPending} onCheckedChange={(checked) => void setStatus(rule, checked)} /></div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
      <CalendarWorkflowRuleDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  );
}
