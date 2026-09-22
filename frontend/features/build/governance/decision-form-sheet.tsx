"use client";

import { useEffect } from "react";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { decisionFormSchema, type DecisionFormValues } from "./governance-schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetBody,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { TicketCombobox } from "@/features/build/shared/ticket-combobox";
import { useProject } from "@/hooks/api/build/projects";
import type { Decision, CreateDecisionInput, UpdateDecisionInput } from "@/types/projects";

const CREATE_DEFAULTS: DecisionFormValues = {
  title: "", context: "", decision: "", optionsConsidered: "",
  status: "proposed", ownerId: "", decidedAt: "", revisitAt: "", linkedTicketId: "",
};

const DECISION_STATUS_VALUES: ReadonlyArray<"proposed" | "accepted" | "superseded" | "revisit"> = ["proposed", "accepted", "superseded", "revisit"];

function decisionToFormValues(d: Decision): DecisionFormValues {
  return {
    title: d.title,
    context: d.context ?? "",
    decision: d.decision ?? "",
    optionsConsidered: d.optionsConsidered ?? "",
    status: DECISION_STATUS_VALUES.find((v) => v === d.status) ?? "proposed",
    ownerId: d.ownerId ?? "",
    decidedAt: d.decidedAt ? d.decidedAt.slice(0, 10) : "",
    revisitAt: d.revisitAt ? d.revisitAt.slice(0, 10) : "",
    linkedTicketId: d.linkedTicketId != null ? String(d.linkedTicketId) : "",
  };
}

interface DecisionFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Decision;
  onSubmitCreate: (input: CreateDecisionInput) => void;
  onSubmitEdit: (input: UpdateDecisionInput & { decisionId: number }) => void;
  isPending?: boolean;
  projectId: number;
}

export function DecisionFormSheet({
  open, onOpenChange, mode, defaultValues,
  onSubmitCreate, onSubmitEdit, isPending, projectId,
}: DecisionFormSheetProps) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";
  const form = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionFormSchema),
    defaultValues: CREATE_DEFAULTS,
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  useEffect(() => {
    if (open) {
      form.reset(mode === "edit" && defaultValues ? decisionToFormValues(defaultValues) : CREATE_DEFAULTS);
    }
  }, [open, mode, defaultValues, form]);

  function handleSubmit(values: DecisionFormValues) {
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({
        decisionId: defaultValues.id,
        title: values.title,
        context: values.context ? values.context : null,
        decision: values.decision ? values.decision : null,
        optionsConsidered: values.optionsConsidered ? values.optionsConsidered : null,
        status: values.status,
        ownerId: values.ownerId ? values.ownerId : null,
        decidedAt: values.decidedAt ? values.decidedAt : null,
        revisitAt: values.revisitAt ? values.revisitAt : null,
        linkedTicketId: values.linkedTicketId ? parseInt(values.linkedTicketId, 10) : null,
      });
    } else {
      onSubmitCreate({
        title: values.title,
        ...(values.context ? { context: values.context } : {}),
        ...(values.decision ? { decision: values.decision } : {}),
        ...(values.optionsConsidered ? { optionsConsidered: values.optionsConsidered } : {}),
        status: values.status,
        ...(values.ownerId ? { ownerId: values.ownerId } : {}),
        ...(values.decidedAt ? { decidedAt: values.decidedAt } : {}),
        ...(values.revisitAt ? { revisitAt: values.revisitAt } : {}),
        ...(values.linkedTicketId ? { linkedTicketId: parseInt(values.linkedTicketId, 10) } : {}),
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{mode === "edit" ? "Edit Decision" : "Log Decision"}</SheetTitle>
          <SheetDescription>
            {mode === "edit" ? "Update decision details." : "Record a key decision for this project."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Short title of the decision" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="context" render={({ field }) => (
                <FormItem>
                  <FormLabel>Context (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="What situation prompted this decision?" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="decision" render={({ field }) => (
                <FormItem>
                  <FormLabel>Decision (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="What was decided?" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="optionsConsidered" render={({ field }) => (
                <FormItem>
                  <FormLabel>Options Considered (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Alternatives that were evaluated…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="proposed">Proposed</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="superseded">Superseded</SelectItem>
                      <SelectItem value="revisit">Revisit</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ownerId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner (optional)</FormLabel>
                  <ProjectMemberSelect
                    projectId={projectId}
                    mode="single"
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? "")}
                    placeholder="Select owner"
                  />
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="decidedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decided At (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="revisitAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revisit At (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="linkedTicketId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Ticket (optional)</FormLabel>
                  <FormControl>
                    <TicketCombobox
                      projectId={projectId}
                      projectKey={projectKey}
                      value={field.value}
                      onChange={field.onChange}
                      allowClear
                      placeholder="Search tickets…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </SheetBody>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Saving…">
                  {mode === "edit" ? "Save Changes" : "Log Decision"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
