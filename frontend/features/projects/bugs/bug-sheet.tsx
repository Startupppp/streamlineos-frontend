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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { useCreateBug, useUpdateBug } from "@/hooks/api/projects/bugs";
import { useOrgMembers } from "@/hooks/api/organization";
import type { Bug, BugSeverity, BugPriority, BugStatus } from "@/types/projects";

const SEVERITIES: BugSeverity[] = ["blocker", "critical", "major", "minor", "trivial"];
const PRIORITIES: BugPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: BugStatus[] = [
  "new", "triaged", "assigned", "in_progress", "fixed",
  "ready_for_qa", "verified", "reopened", "closed",
];
const STATUS_LABELS: Record<BugStatus, string> = {
  new: "New", triaged: "Triaged", assigned: "Assigned", in_progress: "In Progress",
  fixed: "Fixed", ready_for_qa: "Ready for QA", verified: "Verified",
  reopened: "Reopened", closed: "Closed",
};

const schema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  severity: z.enum(["blocker", "critical", "major", "minor", "trivial"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["new", "triaged", "assigned", "in_progress", "fixed", "ready_for_qa", "verified", "reopened", "closed"]),
  stepsToReproduce: z.string(),
  expectedResult: z.string(),
  actualResult: z.string(),
  environment: z.string(),
  browserDevice: z.string(),
  affectedReleaseId: z.string(),
  fixedReleaseId: z.string(),
  assigneeId: z.string(),
  qaOwnerId: z.string(),
  linkedTicketId: z.string(),
});

type FormValues = z.infer<typeof schema>;

const DEFAULT_VALUES: FormValues = {
  title: "", description: "", severity: "major", priority: "medium",
  status: "new", stepsToReproduce: "", expectedResult: "", actualResult: "",
  environment: "", browserDevice: "", affectedReleaseId: "", fixedReleaseId: "",
  assigneeId: "none", qaOwnerId: "none", linkedTicketId: "",
};

interface BugSheetProps {
  projectId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editBug: Bug | null;
  prefill?: Partial<FormValues>;
}

export function BugSheet({ projectId, open, onOpenChange, editBug, prefill }: BugSheetProps) {
  const create = useCreateBug();
  const update = useUpdateBug();
  const { data: membersData } = useOrgMembers(1, 100);
  const members = membersData?.data ?? [];

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: DEFAULT_VALUES,
  });

  useEffect(() => {
    if (!open) return;
    if (editBug) {
      form.reset({
        title: editBug.title,
        description: editBug.description ?? "",
        severity: editBug.severity,
        priority: editBug.priority,
        status: editBug.status,
        stepsToReproduce: editBug.stepsToReproduce ?? "",
        expectedResult: editBug.expectedResult ?? "",
        actualResult: editBug.actualResult ?? "",
        environment: editBug.environment ?? "",
        browserDevice: editBug.browserDevice ?? "",
        affectedReleaseId: editBug.affectedReleaseId != null ? String(editBug.affectedReleaseId) : "",
        fixedReleaseId: editBug.fixedReleaseId != null ? String(editBug.fixedReleaseId) : "",
        assigneeId: editBug.assigneeId ?? "none",
        qaOwnerId: editBug.qaOwnerId ?? "none",
        linkedTicketId: editBug.linkedTicketId != null ? String(editBug.linkedTicketId) : "",
      });
    } else {
      form.reset({ ...DEFAULT_VALUES, ...prefill });
    }
  }, [open, editBug, prefill, form]);

  function handleSubmit(values: FormValues) {
    const input = {
      projectId,
      title: values.title,
      description: values.description || undefined,
      severity: values.severity,
      priority: values.priority,
      status: values.status,
      stepsToReproduce: values.stepsToReproduce || undefined,
      expectedResult: values.expectedResult || undefined,
      actualResult: values.actualResult || undefined,
      environment: values.environment || undefined,
      browserDevice: values.browserDevice || undefined,
      affectedReleaseId: values.affectedReleaseId ? Number(values.affectedReleaseId) : undefined,
      fixedReleaseId: values.fixedReleaseId ? Number(values.fixedReleaseId) : undefined,
      assigneeId: values.assigneeId !== "none" ? values.assigneeId : undefined,
      qaOwnerId: values.qaOwnerId !== "none" ? values.qaOwnerId : undefined,
      linkedTicketId: values.linkedTicketId ? Number(values.linkedTicketId) : undefined,
    };

    if (editBug) {
      update.mutate(
        { ...input, id: editBug.id },
        {
          onSuccess: () => { toast.success("Bug updated"); onOpenChange(false); },
          onError: () => toast.error("Failed to update bug"),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => { toast.success("Bug reported"); onOpenChange(false); },
        onError: () => toast.error("Failed to report bug"),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  function SelectField({ name, label, options, labels }: {
    name: keyof Pick<FormValues, "severity" | "priority" | "status" | "assigneeId" | "qaOwnerId">;
    label: string;
    options: string[];
    labels?: Record<string, string>;
  }) {
    return (
      <div className="space-y-1.5">
        <Label className="text-[11px]">{label}</Label>
        <Select value={form.watch(name)} onValueChange={(v) => form.setValue(name, v as FormValues[typeof name])}>
          <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => (
              <SelectItem key={o} value={o} className="capitalize">
                {labels ? (labels[o] ?? o) : o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-xl">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>{editBug ? "Edit Bug" : "Report Bug"}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <form id="bug-form" onSubmit={form.handleSubmit(handleSubmit)} className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Title *</Label>
              <Input {...form.register("title")} className="h-8 text-[11px]" placeholder="Short bug description" />
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
                placeholder="Detailed description..."
                minHeightClassName="min-h-[80px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <SelectField name="severity" label="Severity" options={SEVERITIES} />
              <SelectField name="priority" label="Priority" options={PRIORITIES} />
              <SelectField name="status" label="Status" options={STATUSES} labels={STATUS_LABELS} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px]">Steps to Reproduce</Label>
              <Textarea {...form.register("stepsToReproduce")} className="text-[11px] min-h-[72px] resize-none" placeholder="1. Go to...&#10;2. Click..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Expected Result</Label>
                <Textarea {...form.register("expectedResult")} className="text-[11px] min-h-[56px] resize-none" placeholder="What should happen" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Actual Result</Label>
                <Textarea {...form.register("actualResult")} className="text-[11px] min-h-[56px] resize-none" placeholder="What actually happens" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Environment</Label>
                <Input {...form.register("environment")} className="h-8 text-[11px]" placeholder="e.g. Production" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Browser / Device</Label>
                <Input {...form.register("browserDevice")} className="h-8 text-[11px]" placeholder="e.g. Chrome 124" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SelectField
                name="assigneeId"
                label="Assignee"
                options={["none", ...members.map((m) => m.userId)]}
                labels={{ none: "Unassigned", ...Object.fromEntries(members.map((m) => [m.userId, m.name ?? m.email])) }}
              />
              <SelectField
                name="qaOwnerId"
                label="QA Owner"
                options={["none", ...members.map((m) => m.userId)]}
                labels={{ none: "Unassigned", ...Object.fromEntries(members.map((m) => [m.userId, m.name ?? m.email])) }}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Affected Release ID</Label>
                <Input {...form.register("affectedReleaseId")} type="number" className="h-8 text-[11px]" placeholder="ID" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Fixed Release ID</Label>
                <Input {...form.register("fixedReleaseId")} type="number" className="h-8 text-[11px]" placeholder="ID" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Linked Ticket ID</Label>
                <Input {...form.register("linkedTicketId")} type="number" className="h-8 text-[11px]" placeholder="ID" />
              </div>
            </div>
          </form>
        </ScrollArea>

        <SheetFooter className="px-5 py-3 border-t shrink-0 flex gap-2">
          <SheetClose asChild>
            <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="bug-form" size="sm" className="text-[11px]" disabled={isPending}>
            {isPending ? "Saving..." : editBug ? "Save Changes" : "Report Bug"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
