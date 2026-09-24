"use client";

import { memo, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  useAddIncidentFollowUpAction,
  useUpdateIncidentFollowUpAction,
} from "@/hooks/api/build/incidents";
import {
  incidentFollowUpSchema,
  type IncidentFollowUpValues,
} from "@/features/build/incidents/incident-schema";
import type { IncidentFollowUpAction, IncidentFollowUpStatus } from "@/types/projects";

const FOLLOW_UP_STATUS_LABELS: Record<IncidentFollowUpStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

const FOLLOW_UP_STATUS_STYLES: Record<IncidentFollowUpStatus, string> = {
  open: "text-status-danger-ink border-status-danger-rule",
  in_progress: "text-status-warning-ink border-status-warning-rule",
  done: "text-status-success-ink border-status-success-rule",
  cancelled: "text-muted-foreground border-border",
};

const FOLLOW_UP_STATUSES: IncidentFollowUpStatus[] = [
  "open",
  "in_progress",
  "done",
  "cancelled",
];

export function unresolvedFollowUpCount(actions: IncidentFollowUpAction[]): number {
  return actions.filter((a) => a.status === "open" || a.status === "in_progress").length;
}

const FollowUpRow = memo(function FollowUpRow({
  projectId,
  incidentId,
  action,
  canManage,
}: {
  projectId: number;
  incidentId: number;
  action: IncidentFollowUpAction;
  canManage: boolean;
}) {
  const updateAction = useUpdateIncidentFollowUpAction();

  function handleStatusChange(next: string) {
    updateAction.mutate(
      {
        projectId,
        incidentId,
        followUpActionId: action.id,
        status: FOLLOW_UP_STATUSES.find((s) => s === next),
      },
      {
        onSuccess: () => toast.success("Follow-up updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 border-l-2 border-border py-0.5 pl-3">
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs text-foreground">{action.title}</p>
        {action.description ? (
          <p className="whitespace-pre-wrap text-micro text-muted-foreground">
            {action.description}
          </p>
        ) : null}
        <p className="text-micro text-muted-foreground">
          {action.ownerId ?? "Unassigned"}
          {action.dueAt
            ? ` · due ${new Date(action.dueAt).toLocaleDateString(undefined, { dateStyle: "medium" })}`
            : ""}
        </p>
      </div>
      {canManage ? (
        <div className="w-36 shrink-0">
          <Select value={action.status} onValueChange={handleStatusChange}>
            <SelectTrigger aria-label={`Status for ${action.title}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FOLLOW_UP_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {FOLLOW_UP_STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <Badge variant="outline" className={`text-micro ${FOLLOW_UP_STATUS_STYLES[action.status]}`}>
          {FOLLOW_UP_STATUS_LABELS[action.status]}
        </Badge>
      )}
    </div>
  );
});

function AddFollowUpForm({ projectId, incidentId }: { projectId: number; incidentId: number }) {
  const addAction = useAddIncidentFollowUpAction();
  const form = useForm<IncidentFollowUpValues>({
    resolver: zodResolver(incidentFollowUpSchema),
    defaultValues: { title: "", description: "", ownerId: "", dueAt: "" },
  });

  function handleSubmit(values: IncidentFollowUpValues) {
    addAction.mutate(
      {
        projectId,
        incidentId,
        title: values.title,
        description: values.description || undefined,
        ownerId: values.ownerId || undefined,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Follow-up added");
          form.reset({ title: "", description: "", ownerId: "", dueAt: "" });
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2 border-t pt-3">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">
                Add follow-up <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="What must happen before this is done?" className="text-dense" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-2">
          <FormField
            control={form.control}
            name="dueAt"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Input {...field} type="date" aria-label="Follow-up due date" className="text-dense" />
                </FormControl>
                <FormMessage className="text-micro" />
              </FormItem>
            )}
          />
          <LoadingButton
            type="submit"
            size="sm"
            className="text-dense"
            isPending={addAction.isPending}
            loadingText="Adding…"
          >
            Add Follow-up
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

export function IncidentFollowUps({
  projectId,
  incidentId,
  actions,
  canManage,
}: {
  projectId: number;
  incidentId: number;
  actions: IncidentFollowUpAction[];
  canManage: boolean;
}) {
  const sorted = useMemo(
    () => [...actions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [actions],
  );
  const unresolved = unresolvedFollowUpCount(actions);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
          Follow-up actions
        </p>
        {unresolved > 0 ? (
          <Badge variant="outline" className="text-micro text-status-warning-ink border-status-warning-rule">
            {unresolved} unresolved
          </Badge>
        ) : null}
      </div>

      {sorted.length === 0 && (
        <p className="text-xs italic text-muted-foreground">No follow-up actions yet.</p>
      )}

      {sorted.map((a) => (
        <FollowUpRow
          key={a.id}
          projectId={projectId}
          incidentId={incidentId}
          action={a}
          canManage={canManage}
        />
      ))}

      {canManage && <AddFollowUpForm projectId={projectId} incidentId={incidentId} />}
    </div>
  );
}
