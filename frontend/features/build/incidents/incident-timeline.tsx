"use client";

import { memo, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import type { IncidentUpdate, IncidentStatus } from "@/types/projects";

const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
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

const updateSchema = z.object({
  message: z.string().min(1, "Message is required"),
  newStatus: z.string(),
});
type UpdateFormValues = z.infer<typeof updateSchema>;

interface AddUpdateFormProps {
  projectId: number;
  incidentId: number;
}

function AddUpdateForm({ projectId, incidentId }: AddUpdateFormProps) {
  const addUpdate = useAddIncidentUpdate();
  const form = useForm<UpdateFormValues>({
    resolver: zodResolver(updateSchema),
    defaultValues: { message: "", newStatus: "none" },
  });

  function handleSubmit(values: UpdateFormValues) {
    addUpdate.mutate(
      {
        projectId,
        incidentId,
        message: values.message,
        newStatus: values.newStatus !== "none" ? STATUSES.find((s) => s === values.newStatus) : undefined,
      },
      {
        onSuccess: () => { toast.success("Update posted"); form.reset({ message: "", newStatus: "none" }); },
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

const TimelineEntry = memo(function TimelineEntry({ update }: { update: IncidentUpdate }) {
  return (
    <div className="border-l-2 border-border pl-3 py-0.5 space-y-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        {update.newStatus && (
          <Badge variant="outline" className={`text-micro ${STATUS_STYLES[update.newStatus]}`}>
            → {STATUS_LABELS[update.newStatus]}
          </Badge>
        )}
        <span className="text-micro text-muted-foreground">
          {update.createdByName ?? update.createdByEmail?.split("@")[0] ?? "System"} · {new Date(update.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </div>
      <p className="text-xs text-foreground whitespace-pre-wrap">{update.message}</p>
    </div>
  );
});

interface IncidentTimelineProps {
  projectId: number;
  incidentId: number;
  updates: IncidentUpdate[];
  canManage: boolean;
}

export function IncidentTimeline({ projectId, incidentId, updates, canManage }: IncidentTimelineProps) {
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
        <AddUpdateForm projectId={projectId} incidentId={incidentId} />
      )}
    </div>
  );
}
