"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from "@/components/ui/sheet";
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { OrgMember } from "@/types/organization";
import type { Decision, CreateDecisionInput, UpdateDecisionInput } from "@/types/projects";

const decisionSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  context: z.string(),
  decision: z.string(),
  optionsConsidered: z.string(),
  status: z.enum(["proposed", "accepted", "superseded", "revisit"]),
  ownerId: z.string(),
  decidedAt: z.string(),
  revisitAt: z.string(),
  linkedTicketId: z.string(),
});

type DecisionFormValues = z.infer<typeof decisionSchema>;

const CREATE_DEFAULTS: DecisionFormValues = {
  title: "", context: "", decision: "", optionsConsidered: "",
  status: "proposed", ownerId: "", decidedAt: "", revisitAt: "", linkedTicketId: "",
};

function decisionToFormValues(d: Decision): DecisionFormValues {
  return {
    title: d.title,
    context: d.context ?? "",
    decision: d.decision ?? "",
    optionsConsidered: d.optionsConsidered ?? "",
    status: d.status,
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
  onSubmitEdit: (input: UpdateDecisionInput & { id: number }) => void;
  isPending?: boolean;
  members: OrgMember[];
}

export function DecisionFormSheet({
  open, onOpenChange, mode, defaultValues,
  onSubmitCreate, onSubmitEdit, isPending, members,
}: DecisionFormSheetProps) {
  const form = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(mode === "edit" && defaultValues ? decisionToFormValues(defaultValues) : CREATE_DEFAULTS);
    }
  }, [open, mode, defaultValues, form]);

  function handleSubmit(values: DecisionFormValues) {
    const payload = {
      title: values.title,
      ...(values.context ? { context: values.context } : {}),
      ...(values.decision ? { decision: values.decision } : {}),
      ...(values.optionsConsidered ? { optionsConsidered: values.optionsConsidered } : {}),
      status: values.status,
      ...(values.ownerId ? { ownerId: values.ownerId } : {}),
      ...(values.decidedAt ? { decidedAt: values.decidedAt } : {}),
      ...(values.revisitAt ? { revisitAt: values.revisitAt } : {}),
      ...(values.linkedTicketId ? { linkedTicketId: parseInt(values.linkedTicketId, 10) } : {}),
    };
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({ id: defaultValues.id, ...payload });
    } else {
      onSubmitCreate(payload);
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
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 overflow-y-auto">
            <div className="flex-1 px-6 py-5 space-y-4">
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
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Select owner" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {members.map((m) => (
                        <SelectItem key={m.userId} value={m.userId}>{m.name ?? m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="decidedAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Decided At (optional)</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="revisitAt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revisit At (optional)</FormLabel>
                    <FormControl><Input {...field} type="date" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="linkedTicketId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked Ticket ID (optional)</FormLabel>
                  <FormControl><Input {...field} placeholder="e.g. 42" inputMode="numeric" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={isPending}>
                {isPending ? "Saving…" : mode === "edit" ? "Save Changes" : "Log Decision"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
