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
  SheetFooter,
  SheetClose,
  SheetBody,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import dynamic from "next/dynamic";

const TiptapEditor = dynamic(
  () => import("@/components/editor/tiptap-editor").then((m) => ({ default: m.TiptapEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-md border border-input bg-background animate-pulse min-h-[120px]" />
    ),
  },
);
import { useCreateBug, useUpdateBug } from "@/hooks/api/projects/bugs";
import { useProject } from "@/hooks/api/projects/projects";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { TicketCombobox } from "@/components/ui/ticket-combobox";
import { ReleaseCombobox } from "@/components/ui/release-combobox";
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
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";

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

  function handleSeverityChange(v: string) {
    const found = SEVERITIES.find((s) => s === v);
    if (found) form.setValue("severity", found);
  }
  function handlePriorityChange(v: string) {
    const found = PRIORITIES.find((p) => p === v);
    if (found) form.setValue("priority", found);
  }
  function handleStatusChange(v: string) {
    const found = STATUSES.find((s) => s === v);
    if (found) form.setValue("status", found);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-xl">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>{editBug ? "Edit Bug" : "Report Bug"}</SheetTitle>
        </SheetHeader>

        <SheetBody>
          <form id="bug-form" onSubmit={form.handleSubmit(handleSubmit)} className="px-5 py-4 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px]">Title *</Label>
              <Input {...form.register("title")} className="text-[11px]" placeholder="Short bug description" />
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
                menuMode="static"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Severity</Label>
                <Select value={form.watch("severity")} onValueChange={handleSeverityChange}>
                  <SelectTrigger className="text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Priority</Label>
                <Select value={form.watch("priority")} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Status</Label>
                <Select value={form.watch("status")} onValueChange={handleStatusChange}>
                  <SelectTrigger className="text-[11px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
                <Input {...form.register("environment")} className="text-[11px]" placeholder="e.g. Production" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Browser / Device</Label>
                <Input {...form.register("browserDevice")} className="text-[11px]" placeholder="e.g. Chrome 124" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Assignee</Label>
                <ProjectMemberSelect
                  projectId={projectId}
                  mode="single"
                  value={form.watch("assigneeId") === "none" ? "" : form.watch("assigneeId")}
                  onChange={(v) => form.setValue("assigneeId", v ?? "none")}
                  allowUnassigned
                  placeholder="Unassigned"
                  className="text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">QA Owner</Label>
                <ProjectMemberSelect
                  projectId={projectId}
                  mode="single"
                  value={form.watch("qaOwnerId") === "none" ? "" : form.watch("qaOwnerId")}
                  onChange={(v) => form.setValue("qaOwnerId", v ?? "none")}
                  allowUnassigned
                  placeholder="Unassigned"
                  className="text-[11px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px]">Affected Release</Label>
                <ReleaseCombobox
                  projectId={projectId}
                  value={form.watch("affectedReleaseId")}
                  onChange={(v) => form.setValue("affectedReleaseId", v)}
                  placeholder="Select release…"
                  allowClear
                  className="text-[11px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px]">Fixed Release</Label>
                <ReleaseCombobox
                  projectId={projectId}
                  value={form.watch("fixedReleaseId")}
                  onChange={(v) => form.setValue("fixedReleaseId", v)}
                  placeholder="Select release…"
                  allowClear
                  className="text-[11px]"
                />
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
                  className="text-[11px]"
                />
              </div>
            </div>
          </form>
        </SheetBody>

        <SheetFooter className="px-5 py-3 border-t shrink-0">
          <div className="grid w-full grid-cols-2 gap-2">
            <SheetClose asChild>
              <Button variant="outline" size="sm" className="text-[11px]">Cancel</Button>
            </SheetClose>
            <LoadingButton type="submit" form="bug-form" size="sm" className="text-[11px]" isPending={isPending} loadingText="Saving…">
              {editBug ? "Save Changes" : "Report Bug"}
            </LoadingButton>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
