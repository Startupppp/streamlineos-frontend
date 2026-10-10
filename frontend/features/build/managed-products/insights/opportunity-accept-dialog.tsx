"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityFormDialog } from "@/components/shared/entity-form-dialog";
import { FIELD_CONTROL_CLASS } from "@/components/ui/field-control";
import type { AcceptOpportunityInput } from "@/hooks/api/build/product-discovery-mutations";

const acceptSchema = z.object({
  horizon: z.enum(["now", "next", "later"]),
  title: z.string().optional(),
  projectId: z.number().int().positive().optional(),
  goalId: z.number().int().positive().optional(),
  releaseId: z.number().int().positive().optional(),
  note: z.string().optional(),
  expectedVersion: z.number().int(),
});

type AcceptFormValues = z.infer<typeof acceptSchema>;

interface Project { id: number; name: string; }
interface Release { id: number; name: string; version: string; }

interface OpportunityAcceptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityTitle: string;
  expectedVersion: number;
  projects?: Project[];
  releases?: Release[];
  isSubmitting: boolean;
  onAccept: (data: AcceptOpportunityInput) => void;
}

export function OpportunityAcceptDialog({
  open,
  onOpenChange,
  opportunityTitle,
  expectedVersion,
  projects = [],
  releases = [],
  isSubmitting,
  onAccept,
}: OpportunityAcceptDialogProps) {
  return (
    <EntityFormDialog<AcceptFormValues>
      open={open}
      onOpenChange={onOpenChange}
      title="Accept opportunity"
      description={`Accepting "${opportunityTitle}" will create a linked roadmap item.`}
      resolver={zodResolver(acceptSchema)}
      defaultValues={{ horizon: "next", expectedVersion }}
      onSubmit={onAccept}
      isSubmitting={isSubmitting}
      submitLabel="Accept"
      resetOnOpen
    >
      {(form) => (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="horizon"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Horizon</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid="horizon-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="now">Now</SelectItem>
                    <SelectItem value="next">Next</SelectItem>
                    <SelectItem value="later">Later</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {projects.length > 0 && (
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to project (optional)</FormLabel>
                  <Select
                    value={field.value !== undefined ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  >
                    <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid="project-select">
                      <SelectValue placeholder="Select project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {releases.length > 0 && (
            <FormField
              control={form.control}
              name="releaseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Link to release (optional)</FormLabel>
                  <Select
                    value={field.value !== undefined ? String(field.value) : ""}
                    onValueChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  >
                    <SelectTrigger className={FIELD_CONTROL_CLASS} data-testid="release-select">
                      <SelectValue placeholder="Select release" />
                    </SelectTrigger>
                    <SelectContent>
                      {releases.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.name} {r.version}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="note"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Note (optional)</FormLabel>
                <Textarea
                  {...field}
                  className={FIELD_CONTROL_CLASS}
                  placeholder="Why are you accepting this opportunity?"
                  rows={3}
                />
                <FormMessage />
              </FormItem>
            )}
          />

          <Input
            type="hidden"
            {...form.register("expectedVersion", { valueAsNumber: true })}
          />
        </div>
      )}
    </EntityFormDialog>
  );
}
