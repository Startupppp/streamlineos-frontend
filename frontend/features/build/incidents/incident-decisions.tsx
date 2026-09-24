"use client";

import { memo, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { useAddIncidentDecision } from "@/hooks/api/build/incidents";
import {
  incidentDecisionSchema,
  type IncidentDecisionValues,
} from "@/features/build/incidents/incident-schema";
import type { IncidentDecision } from "@/hooks/api/build/incidents-schema";
import type { ProjectMemberRecord } from "@/types/projects";
import { formatDateTime } from "@/lib/date-utils";

const DecisionEntry = memo(function DecisionEntry({
  decision,
  members,
}: {
  decision: IncidentDecision;
  members: ProjectMemberRecord[];
}) {
  const member = members.find((item) => item.id === decision.decidedBy);
  const author = member?.name ?? member?.email ?? (decision.decidedBy ? "Former member" : "System");
  return (
    <div className="space-y-0.5 border-l-2 border-border py-0.5 pl-3">
      <p className="text-micro text-muted-foreground">
        {author} · {formatDateTime(decision.createdAt)}
      </p>
      <p className="whitespace-pre-wrap text-xs text-foreground">{decision.decision}</p>
      {decision.rationale ? (
        <p className="whitespace-pre-wrap text-micro text-muted-foreground">{decision.rationale}</p>
      ) : null}
    </div>
  );
});

function AddDecisionForm({ projectId, incidentId }: { projectId: number; incidentId: number }) {
  const addDecision = useAddIncidentDecision();
  const form = useForm<IncidentDecisionValues>({
    resolver: zodResolver(incidentDecisionSchema),
    defaultValues: { decision: "", rationale: "" },
  });
  useRegisterDirtyState(form.formState.isDirty);

  function handleSubmit(values: IncidentDecisionValues) {
    addDecision.mutate(
      {
        projectId,
        incidentId,
        decision: values.decision,
        rationale: values.rationale || undefined,
      },
      {
        onSuccess: () => {
          toast.success("Decision recorded");
          form.reset({ decision: "", rationale: "" });
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
          name="decision"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">
                Record decision <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="What did we decide?"
                  className="text-dense min-h-[56px] resize-none"
                />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rationale"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Textarea
                  {...field}
                  aria-label="Decision rationale"
                  placeholder="Why? (optional)"
                  className="text-dense min-h-[48px] resize-none"
                />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <LoadingButton
          type="submit"
          size="sm"
          className="text-dense"
          isPending={addDecision.isPending}
          loadingText="Recording…"
        >
          Record Decision
        </LoadingButton>
      </form>
    </Form>
  );
}

export function IncidentDecisions({
  projectId,
  incidentId,
  decisions,
  canManage,
  members,
}: {
  projectId: number;
  incidentId: number;
  decisions: IncidentDecision[];
  canManage: boolean;
  members: ProjectMemberRecord[];
}) {
  const sorted = useMemo(
    () =>
      [...decisions].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [decisions],
  );

  return (
    <div className="space-y-3">
      <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
        Decisions
      </p>

      {sorted.length === 0 && (
        <p className="text-xs italic text-muted-foreground">No decisions recorded yet.</p>
      )}

      {sorted.map((d) => (
        <DecisionEntry key={d.id} decision={d} members={members} />
      ))}

      {canManage && <AddDecisionForm projectId={projectId} incidentId={incidentId} />}
    </div>
  );
}
