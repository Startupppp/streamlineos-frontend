"use client";

import { memo, useMemo } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  incidentUpdateSchema,
  type IncidentUpdateValues,
} from "@/features/build/incidents/incident-schema";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useAddIncidentUpdate } from "@/hooks/api/build/incidents";
import type { IncidentDetail, IncidentStatus } from "@/hooks/api/build/incidents-schema";
import { formatDateTime } from "@/lib/date-utils";

const STATUS_LABELS: Record<string, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

const STATUS_STYLES: Record<string, string> = {
  detected: "text-status-danger-ink border-status-danger-rule",
  investigating: "text-status-warning-ink border-status-warning-rule",
  mitigating: "text-status-warning-ink border-status-warning-rule",
  resolved: "text-status-success-ink border-status-success-rule",
  postmortem: "text-status-info-ink border-status-info-rule",
  closed: "text-muted-foreground border-border",
};

const STATUSES: IncidentStatus[] = [
  "detected", "investigating", "mitigating", "resolved", "postmortem", "closed",
];

interface AddUpdateFormProps {
  projectId: number;
  incidentId: number;
  unresolvedFollowUps: number;
}

function AddUpdateForm({ projectId, incidentId, unresolvedFollowUps }: AddUpdateFormProps) {
  const addUpdate = useAddIncidentUpdate();
  const form = useForm<IncidentUpdateValues>({
    resolver: zodResolver(incidentUpdateSchema),
    defaultValues: { message: "", newStatus: "none", followUpWaiverReason: "" },
  });
  useRegisterDirtyState(form.formState.isDirty);

  function handleSubmit(values: IncidentUpdateValues) {
    if (values.newStatus === "closed" && unresolvedFollowUps > 0 && !values.followUpWaiverReason.trim()) {
      form.setError("followUpWaiverReason", { message: "Explain why unresolved follow-ups can be waived" });
      return;
    }
    addUpdate.mutate(
      {
        projectId,
        incidentId,
        message: values.message,
        newStatus: values.newStatus !== "none" ? STATUSES.find((s) => s === values.newStatus) : undefined,
        followUpWaiverReason: values.followUpWaiverReason.trim() || undefined,
      },
      {
        onSuccess: () => { toast.success("Update posted"); form.reset({ message: "", newStatus: "none", followUpWaiverReason: "" }); },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2 pt-3 border-t">
        <FormField
          control={form.control}
          name="message"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Post update <span className="text-destructive">*</span></FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="What's the latest status?" className="text-dense min-h-[64px] resize-none" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        {form.watch("newStatus") === "closed" && unresolvedFollowUps > 0 ? (
          <FormField
            control={form.control}
            name="followUpWaiverReason"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-dense">Closure waiver</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Why can the unresolved follow-ups be waived?" className="text-dense min-h-[64px] resize-none" />
                </FormControl>
                <FormMessage className="text-micro" />
              </FormItem>
            )}
          />
        ) : null}
        <div className="flex items-center gap-2">
          <div className="w-44">
            <FormField
              control={form.control}
              name="newStatus"
              render={({ field }) => (
                <FormItem>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Change status?" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">No status change</SelectItem>
                      {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-micro" />
                </FormItem>
              )}
            />
          </div>
          <LoadingButton type="submit" size="sm" className="text-dense" isPending={addUpdate.isPending} loadingText="Posting…">
            Post Update
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

type IncidentTimelineUpdate = IncidentDetail["updates"][number];

const TimelineEntry = memo(function TimelineEntry({ update }: { update: IncidentTimelineUpdate }) {
  return (
    <div className="border-l-2 border-border pl-3 py-0.5 space-y-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        {update.newStatus && (
          <Badge variant="outline" className={`text-micro ${STATUS_STYLES[update.newStatus]}`}>
            → {STATUS_LABELS[update.newStatus]}
          </Badge>
        )}
        <span className="text-micro text-muted-foreground">
          {update.createdByName ?? update.createdByEmail ?? "System"} · {formatDateTime(update.createdAt)}
        </span>
      </div>
      <p className="text-xs text-foreground whitespace-pre-wrap">{update.message}</p>
    </div>
  );
});

interface IncidentTimelineProps {
  projectId: number;
  incidentId: number;
  updates: IncidentTimelineUpdate[];
  canManage: boolean;
  unresolvedFollowUps: number;
}

export function IncidentTimeline({ projectId, incidentId, updates, canManage, unresolvedFollowUps }: IncidentTimelineProps) {
  const sorted = useMemo(
    () => [...updates].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [updates],
  );

  return (
    <div className="space-y-3">
      <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        Timeline
      </p>

      {sorted.length === 0 && (
        <p className="text-xs text-muted-foreground italic">No updates yet.</p>
      )}

      {sorted.map((u) => (
        <TimelineEntry key={u.id} update={u} />
      ))}

      {canManage && (
        <AddUpdateForm projectId={projectId} incidentId={incidentId} unresolvedFollowUps={unresolvedFollowUps} />
      )}
    </div>
  );
}
