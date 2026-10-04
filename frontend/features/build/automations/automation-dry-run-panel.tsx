"use client";

import { useState, useCallback } from "react";
import { Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/get-error-message";
import { toast } from "sonner";
import { useCustomStates } from "@/hooks/api/build/custom-states";
import { useAutomationDryRun, ACTION_TYPES, TRIGGER_EVENTS } from "@/hooks/api/build/automations";
import type { AutomationDryRunItem } from "@/hooks/api/build/automation-analysis-schema";
import { PRIORITY_OPTIONS, TICKET_TYPE_OPTIONS } from "./automation-value-input";

function getActionLabel(type: string): string {
  return ACTION_TYPES.find((a) => a.value === type)?.label ?? type;
}

function getTriggerLabel(event: string): string {
  return TRIGGER_EVENTS.find((t) => t.value === event)?.label ?? event;
}

interface DryRunResultRowProps {
  item: AutomationDryRunItem;
  ruleIndex: number;
}

function DryRunResultRow({ item, ruleIndex }: DryRunResultRowProps) {
  return (
    <div
      className={cn(
        "rounded-lg border p-2.5 text-xs",
        item.matched
          ? "border-status-success-fill/40 bg-status-success-fill/5"
          : "border-border bg-muted/30",
      )}
    >
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "font-mono font-semibold",
            item.matched ? "text-status-success-ink" : "text-muted-foreground",
          )}
        >
          {item.matched ? "Matched" : "No match"}
        </span>
        <span className="text-muted-foreground">rule #{ruleIndex + 1}</span>
      </div>
      {item.matched && item.actions.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {item.actions.map((a, i) => (
            <Badge key={i} variant="outline" className="text-micro px-1.5 py-0">
              {getActionLabel(a.type)}: {a.value}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

interface AutomationDryRunPanelProps {
  projectId: number;
  automationId: number;
  triggerEvent: string;
}

export function AutomationDryRunPanel({
  projectId,
  automationId,
  triggerEvent,
}: AutomationDryRunPanelProps) {
  const { data: states = [] } = useCustomStates(projectId);
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [type, setType] = useState("");
  const [items, setItems] = useState<AutomationDryRunItem[] | null>(null);
  const dryRun = useAutomationDryRun(projectId);

  const handleRun = useCallback(() => {
    dryRun.mutate(
      {
        triggerEvent,
        ticket: {
          ...(status ? { status } : {}),
          ...(priority ? { priority } : {}),
          ...(type ? { type } : {}),
        },
      },
      {
        onSuccess: (result) => {
          setItems(result.items);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [dryRun, triggerEvent, status, priority, type]);

  const ruleItems = items?.filter((item) => item.ruleId === automationId) ?? items;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          Trigger: {getTriggerLabel(triggerEvent)}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Status…" />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s.id} value={s.name} className="text-xs">
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Priority…" />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Type…" />
          </SelectTrigger>
          <SelectContent>
            {TICKET_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t.value} value={t.value} className="text-xs">
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-7 w-full gap-1.5 text-xs"
        onClick={handleRun}
        disabled={dryRun.isPending}
        aria-label="Run dry-run test"
      >
        {dryRun.isPending ? (
          <Loader2 className="h-3 w-3 animate-spin" />
        ) : (
          <Zap className="h-3 w-3" />
        )}
        Test rule
      </Button>
      {items !== null && (
        <div className="space-y-1.5">
          {(ruleItems ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No results for this rule.</p>
          ) : (
            (ruleItems ?? []).map((item, i) => (
              <DryRunResultRow key={item.ruleId} item={item} ruleIndex={i} />
            ))
          )}
        </div>
      )}
    </div>
  );
}
