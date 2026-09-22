"use client";

import { useState } from "react";
import { toast } from "sonner";
import { AppSheet } from "@/components/shared";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingButton } from "@/components/ui/loading-button";
import { UserCombobox } from "@/components/ui/user-combobox";
import { ErrorState } from "@/components/shared/error-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FIELD_SELECT_CONTENT_CLASS } from "@/components/ui/field-control";
import { getErrorMessage } from "@/lib/get-error-message";
import {
  HELPDESK_CATEGORIES,
  SUPPORT_QUEUES,
  SUPPORT_QUEUE_LABELS,
  helpdeskCategoryLabel,
  isSupportQueue,
} from "@/lib/employee-support";
import {
  useConfigureSupportQueue,
  useDeleteSupportRoutingRule,
  useSupportRoutingRules,
  useUpsertSupportRoutingRule,
} from "@/hooks/api/hr/helpdesk";
import type { HelpdeskQueueSummary, HelpdeskRoutingRule } from "@/hooks/api/hr/helpdesk-schema";

interface SupportQueueSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  queues: readonly HelpdeskQueueSummary[];
}

function QueueSlaForm({ summary }: { summary: HelpdeskQueueSummary }) {
  const configure = useConfigureSupportQueue();
  const [firstResponseHours, setFirstResponseHours] = useState(String(summary.firstResponseHours));
  const [resolutionHours, setResolutionHours] = useState(String(summary.resolutionHours));
  const [escalationUserId, setEscalationUserId] = useState(summary.escalationUserId ?? "");

  function handleFirstResponseChange(event: React.ChangeEvent<HTMLInputElement>) {
    setFirstResponseHours(event.target.value);
  }

  function handleResolutionChange(event: React.ChangeEvent<HTMLInputElement>) {
    setResolutionHours(event.target.value);
  }

  function handleSave() {
    const first = Number(firstResponseHours);
    const resolution = Number(resolutionHours);
    if (!Number.isInteger(first) || first < 1 || !Number.isInteger(resolution) || resolution < first) {
      toast.error("First response must be at least 1 hour and no later than resolution.");
      return;
    }
    configure.mutate(
      { queue: summary.queue, firstResponseHours: first, resolutionHours: resolution, escalationUserId: escalationUserId || null },
      {
        onSuccess: () => toast.success(`${SUPPORT_QUEUE_LABELS[summary.queue]} queue updated`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{SUPPORT_QUEUE_LABELS[summary.queue]} queue</p>
        <span className="text-micro text-muted-foreground">{summary.source === "org" ? "Customised" : "Default SLA"}</span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label htmlFor={`first-${summary.queue}`}>First response (hours)</Label>
          <Input id={`first-${summary.queue}`} type="number" min={1} value={firstResponseHours} onChange={handleFirstResponseChange} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`resolution-${summary.queue}`}>Resolution (hours)</Label>
          <Input id={`resolution-${summary.queue}`} type="number" min={1} value={resolutionHours} onChange={handleResolutionChange} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label>Escalation target</Label>
        <UserCombobox value={escalationUserId} onChange={setEscalationUserId} allowUnassigned placeholder="Support administrators (default)" />
      </div>
      <div className="flex justify-end">
        <LoadingButton size="sm" variant="outline" isPending={configure.isPending} onClick={handleSave}>
          Save {SUPPORT_QUEUE_LABELS[summary.queue]} SLA
        </LoadingButton>
      </div>
    </div>
  );
}

function RoutingRow({ rule }: { rule: HelpdeskRoutingRule }) {
  const upsert = useUpsertSupportRoutingRule();
  const remove = useDeleteSupportRoutingRule();
  const known = HELPDESK_CATEGORIES.find((candidate) => candidate === rule.category);
  const category = helpdeskCategoryLabel(rule.category);

  function handleQueueChange(value: string) {
    if (!isSupportQueue(value) || known === undefined) return;
    upsert.mutate(
      { category: known, queue: value },
      {
        onSuccess: () => toast.success(`${category} now routes to ${SUPPORT_QUEUE_LABELS[value]}`),
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  function handleReset() {
    if (rule.ruleId === null) return;
    remove.mutate(rule.ruleId, {
      onSuccess: () => toast.success(`${category} routing reset to default`),
      onError: (error) => toast.error(getErrorMessage(error)),
    });
  }

  return (
    <div className="flex items-center gap-2 py-2">
      <span className="min-w-0 flex-1 truncate text-sm">{category}</span>
      <Select value={rule.queue} onValueChange={handleQueueChange} disabled={upsert.isPending}>
        <SelectTrigger className="w-32" aria-label={`Queue for ${category}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent className={FIELD_SELECT_CONTENT_CLASS}>
          {SUPPORT_QUEUES.map((queue) => (
            <SelectItem key={queue} value={queue}>
              {SUPPORT_QUEUE_LABELS[queue]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {rule.source === "org" ? (
        <LoadingButton size="sm" variant="ghost" isPending={remove.isPending} onClick={handleReset}>
          Reset
        </LoadingButton>
      ) : (
        <span className="w-16 text-center text-micro text-muted-foreground">default</span>
      )}
    </div>
  );
}

export function SupportQueueSettingsSheet({ open, onOpenChange, queues }: SupportQueueSettingsSheetProps) {
  const routing = useSupportRoutingRules();

  function handleRetry() {
    void routing.refetch();
  }

  return (
    <AppSheet open={open} onOpenChange={onOpenChange} title="Queue settings" description="Service levels, escalation targets and category routing for every queue.">
      <div className="space-y-6">
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Service levels</h3>
          {queues.map((summary) => (
            <QueueSlaForm key={summary.queue} summary={summary} />
          ))}
        </section>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">Routing by category</h3>
          {routing.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : routing.isError ? (
            <ErrorState compact title="Couldn't load routing rules" description={getErrorMessage(routing.error)} onRetry={handleRetry} />
          ) : (
            <div className="divide-y divide-border">
              {(routing.data ?? []).map((rule) => (
                <RoutingRow key={rule.category} rule={rule} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppSheet>
  );
}
