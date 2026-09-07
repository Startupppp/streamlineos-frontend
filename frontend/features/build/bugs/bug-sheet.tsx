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
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
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
import { useCreateBug, useUpdateBug } from "@/hooks/api/build/bugs";
import { useProject } from "@/hooks/api/build/projects";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { TicketCombobox } from "@/features/build/shared/ticket-combobox";
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
        severity: SEVERITIES.find((v) => v === editBug.severity) ?? "major",
        priority: PRIORITIES.find((v) => v === editBug.priority) ?? "medium",
        status: STATUSES.find((v) => v === editBug.status) ?? "new",
        stepsToReproduce: editBug.stepsToReproduce ?? "",
        expectedResult: editBug.expectedResult ?? "",
        actualResult: editBug.actualResult ?? "",
        environment: editBug.environment ?? "",
        browserDevice: editBug.browserDevice ?? "",
        affectedReleaseId: editBug.affectedReleaseId != null ? String(editBug.affectedReleaseId) : "",
        fixedReleaseId: editBug.fixedReleaseId != null ? String(editBug.fixedReleaseId) : "",
        assigneeId: "none",
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
          onError: (e) => toast.error(getErrorMessage(e)),
        },
      );
    } else {
      create.mutate(input, {
        onSuccess: () => { toast.success("Bug reported"); onOpenChange(false); },
        onError: (e) => toast.error(getErrorMessage(e)),
      });
    }
  }

  const isPending = create.isPending || update.isPending;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="p-0 flex flex-col w-full sm:max-w-xl">
        <SheetHeader className="px-5 py-4 border-b shrink-0">
          <SheetTitle>{editBug ? "Edit Bug" : "Report Bug"}</SheetTitle>
        </SheetHeader>

        <Form {...form}>
          <form id="bug-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col flex-1 min-h-0">
            <SheetBody>
              <div className="px-5 py-4 space-y-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Title <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input {...field} className="text-dense" placeholder="Short bug description" />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Description</FormLabel>
                      <FormControl>
                        <TiptapEditor
                          content={field.value}
                          output="html"
                          onChangeHtml={field.onChange}
                          placeholder="Detailed description..."
                          minHeightClassName="min-h-[80px]"
                          menuMode="static"
                        />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="severity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Severity</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SEVERITIES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Priority</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {PRIORITIES.map((p) => (
                              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Status</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="stepsToReproduce"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-dense">Steps to Reproduce</FormLabel>
                      <FormControl>
                        <Textarea {...field} className="text-dense min-h-[72px] resize-none" placeholder="1. Go to...&#10;2. Click..." />
                      </FormControl>
                      <FormMessage className="text-micro" />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="expectedResult"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Expected Result</FormLabel>
                        <FormControl>
                          <Textarea {...field} className="text-dense min-h-[56px] resize-none" placeholder="What should happen" />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="actualResult"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Actual Result</FormLabel>
                        <FormControl>
                          <Textarea {...field} className="text-dense min-h-[56px] resize-none" placeholder="What actually happens" />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="environment"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Environment</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-dense" placeholder="e.g. Production" />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="browserDevice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Browser / Device</FormLabel>
                        <FormControl>
                          <Input {...field} className="text-dense" placeholder="e.g. Chrome 124" />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="assigneeId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Assignee</FormLabel>
                        <ProjectMemberSelect
                          projectId={projectId}
                          mode="single"
                          value={field.value === "none" ? "" : field.value}
                          onChange={(v) => field.onChange(v ?? "none")}
                          allowUnassigned
                          placeholder="Unassigned"
                          className="text-dense"
                        />
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="qaOwnerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">QA Owner</FormLabel>
                        <ProjectMemberSelect
                          projectId={projectId}
                          mode="single"
                          value={field.value === "none" ? "" : field.value}
                          onChange={(v) => field.onChange(v ?? "none")}
                          allowUnassigned
                          placeholder="Unassigned"
                          className="text-dense"
                        />
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <FormField
                    control={form.control}
                    name="affectedReleaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Affected Release</FormLabel>
                        <FormControl>
                          <ReleaseCombobox
                            projectId={projectId}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select release…"
                            allowClear
                            className="text-dense"
                          />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="fixedReleaseId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Fixed Release</FormLabel>
                        <FormControl>
                          <ReleaseCombobox
                            projectId={projectId}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Select release…"
                            allowClear
                            className="text-dense"
                          />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="linkedTicketId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-dense">Linked Ticket</FormLabel>
                        <FormControl>
                          <TicketCombobox
                            projectId={projectId}
                            projectKey={projectKey}
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="Link a ticket…"
                            allowClear
                            className="text-dense"
                          />
                        </FormControl>
                        <FormMessage className="text-micro" />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </SheetBody>

            <SheetFooter className="px-5 py-3 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <SheetClose asChild>
                  <Button variant="outline" size="sm" className="text-dense">Cancel</Button>
                </SheetClose>
                <LoadingButton type="submit" size="sm" className="text-dense" isPending={isPending} loadingText="Saving…">
                  {editBug ? "Save Changes" : "Report Bug"}
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
