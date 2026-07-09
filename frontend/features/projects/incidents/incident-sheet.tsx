"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { useCreateIncident, useUpdateIncident } from "@/hooks/api/projects/incidents";
import { useProject } from "@/hooks/api/projects/projects";
import { UserCombobox } from "@/components/ui/user-combobox";
import { TicketCombobox } from "@/components/ui/ticket-combobox";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/types/projects";

const SEVERITIES: IncidentSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: IncidentStatus[] = [
  "detected", "investigating", "mitigating", "resolved", "postmortem", "closed",
];
const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  severity: z.enum(["critical", "high", "medium", "low"]),
  status: z.enum(["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"]),
  impact: z.string(),
  ownerId: z.string(),
  detectedAt: z.string(),
  responseDueAt: z.string(),
  resolutionDueAt: z.string(),
  linkedTicketId: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  title: "", description: "", severity: "medium", status: "detected",
  impact: "", ownerId: "", detectedAt: "", responseDueAt: "",
  resolutionDueAt: "", linkedTicketId: "",
};

function toLocalDt(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

interface IncidentSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editIncident: Incident | null;
}

export function IncidentSheet({ projectId, open, onOpenChange, editIncident }: IncidentSheetProps) {
  const create = useCreateIncident();
  const update = useUpdateIncident();
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULT_VALUES });

  useEffect(() => {
    if (!open) return;
    if (editIncident) {
      form.reset({
        title: editIncident.title,
        description: editIncident.description ?? "",
        severity: editIncident.severity,
        status: editIncident.status,
        impact: editIncident.impact ?? "",
        ownerId: editIncident.ownerId ?? "",
        detectedAt: toLocalDt(editIncident.detectedAt),
        responseDueAt: toLocalDt(editIncident.responseDueAt),
        resolutionDueAt: toLocalDt(editIncident.resolutionDueAt),
        linkedTicketId: editIncident.linkedTicketId != null ? String(editIncident.linkedTicketId) : "",
      });
    } else {
      form.reset(DEFAULT_VALUES);
    }
  }, [open, editIncident, form]);

  function handleSubmit(values: FormValues) {
    const input = {
      projectId,
      title: values.title,
      description: values.description || undefined,
      severity: values.severity,
      status: values.status,
      impact: values.impact || undefined,
      ownerId: values.ownerId || undefined,
      detectedAt: values.detectedAt ? new Date(values.detectedAt).toISOString() : undefined,
      responseDueAt: values.responseDueAt ? new Date(values.responseDueAt).toISOString() : undefined,
      resolutionDueAt: values.resolutionDueAt ? new Date(values.resolutionDueAt).toISOString() : undefined,
      linkedTicketId: values.linkedTicketId ? Number(values.linkedTicketId) : undefined,
    };

    if (editIncident) {
      update.mutate(
        { ...input, id: editIncident.id },
        {
          onSuccess: () => { toast.success("Incident updated"); onOpenChange(false); },
          onError: () => toast.error("Failed to update incident"),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => { toast.success("Incident created"); onOpenChange(false); },
        onError: () => toast.error("Failed to create incident"),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-xl">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>{editIncident ? "Edit Incident" : "New Incident"}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <form id="incident-form" onSubmit={form.handleSubmit(handleSubmit)} className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Title *</Label>
              <Input {...form.register("title")} className="h-8 text-[11px]" placeholder="Short incident summary" />
              {form.formState.errors.title && (
                <p className="text-[10px] text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Description</Label>
              <TiptapEditor
                content={form.watch("description")}
                output="html"
                onChangeHtml={(v) => form.setValue("description", v)}
                placeholder="What happened?"
                minHeightClassName="min-h-[80px]"
                menuMode="static"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Severity</Label>
                <Select value={form.watch("severity")} onValueChange={(v) => form.setValue("severity", v as IncidentSeverity)}>
                  <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Status</Label>
                <Select value={form.watch("status")} onValueChange={(v) => form.setValue("status", v as IncidentStatus)}>
                  <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Impact</Label>
              <Input {...form.register("impact")} className="h-8 text-[11px]" placeholder="Who / what is affected?" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Owner</Label>
              <UserCombobox
                value={form.watch("ownerId")}
                onChange={(v) => form.setValue("ownerId", v)}
                placeholder="Unassigned"
                allowUnassigned
                className="h-8 text-[11px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Detected at</Label>
                <Input {...form.register("detectedAt")} type="datetime-local" className="h-8 text-[11px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Response due</Label>
                <Input {...form.register("responseDueAt")} type="datetime-local" className="h-8 text-[11px]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Resolution due</Label>
                <Input {...form.register("resolutionDueAt")} type="datetime-local" className="h-8 text-[11px]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Linked Ticket</Label>
              <TicketCombobox
                projectId={projectId}
                projectKey={projectKey}
                value={form.watch("linkedTicketId")}
                onChange={(v) => form.setValue("linkedTicketId", v)}
                placeholder="Link a ticket…"
                allowClear
                className="h-8 text-[11px]"
              />
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="px-5 py-3 border-t shrink-0 flex gap-2">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="incident-form" size="sm" className="text-[11px]" disabled={isPending}>
            {isPending ? "Saving..." : editIncident ? "Save Changes" : "Create Incident"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
