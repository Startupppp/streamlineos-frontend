"use client";

import { memo, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { useAddIncidentUpdate } from "@/hooks/api/projects/incidents";
import type { IncidentUpdate, IncidentStatus } from "@/types/projects";

const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  detected: "text-red-600 border-red-200",
  investigating: "text-orange-600 border-orange-200",
  mitigating: "text-amber-600 border-amber-200",
  resolved: "text-emerald-600 border-emerald-200",
  postmortem: "text-blue-600 border-blue-200",
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
        onError: () => toast.error("Failed to post update"),
      },
    );
  }

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2 pt-3 border-t">
      <div className="space-y-1.5">
        <Label className="text-[11px]">Post update</Label>
        <Textarea
          {...form.register("message")}
          placeholder="What's the latest status?"
          className="text-[11px] min-h-[64px] resize-none"
        />
        {form.formState.errors.message && (
          <p className="text-[10px] text-destructive">{form.formState.errors.message.message}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="w-44">
          <Select value={form.watch("newStatus")} onValueChange={(v) => form.setValue("newStatus", v)}>
            <SelectTrigger className="h-7 text-[11px]"><SelectValue placeholder="Change status?" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No status change</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <LoadingButton type="submit" size="sm" className="h-7 text-[11px]" isPending={addUpdate.isPending} loadingText="Posting…">
          Post Update
        </LoadingButton>
      </div>
    </form>
  );
}

const TimelineEntry = memo(function TimelineEntry({ update }: { update: IncidentUpdate }) {
  return (
    <div className="border-l-2 border-border pl-3 py-0.5 space-y-0.5">
      <div className="flex items-center gap-2 flex-wrap">
        {update.newStatus && (
          <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[update.newStatus]}`}>
            → {STATUS_LABELS[update.newStatus]}
          </Badge>
        )}
        <span className="text-[10px] text-muted-foreground">
          {update.createdBy ?? "System"} · {new Date(update.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
        </span>
      </div>
      <p className="text-[12px] text-foreground whitespace-pre-wrap">{update.message}</p>
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
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        Timeline
      </p>

      {sorted.length === 0 && (
        <p className="text-[12px] text-muted-foreground italic">No updates yet.</p>
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
