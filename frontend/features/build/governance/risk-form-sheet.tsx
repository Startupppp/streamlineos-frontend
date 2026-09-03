"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { TicketCombobox } from "@/features/build/shared/ticket-combobox";
import { useProject } from "@/hooks/api/build/projects";
import type { Risk, CreateRiskInput, UpdateRiskInput } from "@/types/projects";

const riskSchema = z.object({
  title: z.string().min(1, "Required").max(200),
  description: z.string(),
  probability: z.enum(["low", "medium", "high"]),
  impact: z.enum(["low", "medium", "high"]),
  status: z.enum(["open", "mitigating", "monitoring", "accepted", "closed"]),
  ownerId: z.string(),
  mitigation: z.string(),
  linkedTicketId: z.string(),
});

type RiskFormValues = z.infer<typeof riskSchema>;

const CREATE_DEFAULTS: RiskFormValues = {
  title: "", description: "", probability: "medium", impact: "medium",
  status: "open", ownerId: "", mitigation: "", linkedTicketId: "",
};

function riskToFormValues(r: Risk): RiskFormValues {
  return {
    title: r.title,
    description: r.description ?? "",
    probability: r.probability,
    impact: r.impact,
    status: r.status,
    ownerId: r.ownerId ?? "",
    mitigation: r.mitigation ?? "",
    linkedTicketId: r.linkedTicketId != null ? String(r.linkedTicketId) : "",
  };
}

interface RiskFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  defaultValues?: Risk;
  onSubmitCreate: (input: CreateRiskInput) => void;
  onSubmitEdit: (input: UpdateRiskInput & { id: number }) => void;
  isPending?: boolean;
  projectId: number;
}

export function RiskFormSheet({
  open, onOpenChange, mode, defaultValues,
  onSubmitCreate, onSubmitEdit, isPending, projectId,
}: RiskFormSheetProps) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";
  const form = useForm<RiskFormValues>({
    resolver: zodResolver(riskSchema),
    defaultValues: CREATE_DEFAULTS,
  });

  useEffect(() => {
    if (open) {
      form.reset(mode === "edit" && defaultValues ? riskToFormValues(defaultValues) : CREATE_DEFAULTS);
    }
  }, [open, mode, defaultValues, form]);

  function handleSubmit(values: RiskFormValues) {
    if (mode === "edit" && defaultValues) {
      onSubmitEdit({
        id: defaultValues.id,
        title: values.title,
        ...(values.description ? { description: values.description } : {}),
        probability: values.probability,
        impact: values.impact,
        status: values.status,
        ...(values.ownerId ? { ownerId: values.ownerId } : {}),
        ...(values.mitigation ? { mitigation: values.mitigation } : {}),
        ...(values.linkedTicketId ? { linkedTicketId: parseInt(values.linkedTicketId, 10) } : {}),
      });
    } else {
      onSubmitCreate({
        title: values.title,
        ...(values.description ? { description: values.description } : {}),
        probability: values.probability,
        impact: values.impact,
        status: values.status,
        ...(values.ownerId ? { ownerId: values.ownerId } : {}),
        ...(values.mitigation ? { mitigation: values.mitigation } : {}),
        ...(values.linkedTicketId ? { linkedTicketId: parseInt(values.linkedTicketId, 10) } : {}),
      });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>{mode === "edit" ? "Edit Risk" : "New Risk"}</SheetTitle>
          <SheetDescription>
            {mode === "edit" ? "Update risk details." : "Log a risk to this project."}
          </SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody className="px-6 py-5 space-y-4">
              <FormField control={form.control} name="title" render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} placeholder="Describe the risk" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Additional context…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="probability" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Probability</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="impact" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Impact</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="mitigating">Mitigating</SelectItem>
                      <SelectItem value="monitoring">Monitoring</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
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
              <FormField control={form.control} name="mitigation" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mitigation Plan (optional)</FormLabel>
                  <FormControl><Textarea {...field} rows={3} placeholder="Describe mitigation steps…" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
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
                  {mode === "edit" ? "Save Changes" : "Add Risk"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
