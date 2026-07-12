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
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Combobox } from "@/components/ui/combobox";
import { UserCombobox } from "@/components/ui/user-combobox";
import { useProject } from "@/hooks/api/projects";
import { useTickets } from "@/hooks/api/projects/tickets";
import { useProjectMilestones } from "@/hooks/api/projects/milestones";
import { useReleases } from "@/hooks/api/projects/releases";
import type { ApprovalEntityType, CreateApprovalInput } from "@/types/projects";

const ENTITY_TYPES: { value: ApprovalEntityType; label: string }[] = [
  { value: "task", label: "Task" },
  { value: "milestone", label: "Milestone" },
  { value: "release", label: "Release" },
  { value: "budget", label: "Budget" },
  { value: "change_request", label: "Change Request" },
  { value: "document", label: "Document" },
  { value: "timesheet", label: "Timesheet" },
  { value: "client_approval", label: "Client Approval" },
];

const TITLE_REGEX = /\S/;

const schema = z.object({
  entityType: z.enum([
    "task", "milestone", "budget", "release",
    "change_request", "document", "timesheet", "client_approval",
  ] as [ApprovalEntityType, ...ApprovalEntityType[]]),
  entityId: z.string().min(1, "Select an item"),
  title: z
    .string()
    .min(1, "Required")
    .max(200, "Max 200 characters")
    .refine((v) => TITLE_REGEX.test(v), { message: "Title cannot be blank" }),
  approverId: z.string().min(1, "Select an approver"),
  reason: z.string().max(2000, "Max 2000 characters").optional(),
  dueAt: z.string().optional(),
  level: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface RequestApprovalSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (input: CreateApprovalInput) => void;
  isPending?: boolean;
  projectId: number;
  currentUserId?: string;
  defaultEntityType?: ApprovalEntityType;
}

function useEntityItems(projectId: number, entityType: ApprovalEntityType) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";

  const ticketsEnabled = entityType === "task";
  const { data: ticketsData, isFetching: ticketsFetching } = useTickets(
    projectId,
    { limit: 50 },
    { enabled: ticketsEnabled },
  );

  const milestonesEnabled = entityType === "milestone";
  const { data: milestones, isFetching: milestonesFetching } = useProjectMilestones(
    milestonesEnabled ? projectId : 0,
  );

  const releasesEnabled = entityType === "release";
  const { data: releases, isFetching: releasesFetching } = useReleases(
    releasesEnabled ? projectId : 0,
  );

  if (entityType === "task") {
    const tickets = ticketsData?.data ?? [];
    return {
      options: tickets.map((t) => ({
        value: String(t.id),
        label: projectKey ? `${projectKey}-${t.ticketNumber} · ${t.title}` : t.title,
        sublabel: t.status,
        title: t.title,
      })),
      isFetching: ticketsFetching,
    };
  }

  if (entityType === "milestone") {
    return {
      options: (milestones ?? []).map((m) => ({
        value: String(m.id),
        label: m.name,
        sublabel: m.status,
        title: m.name,
      })),
      isFetching: milestonesFetching,
    };
  }

  if (entityType === "release") {
    return {
      options: (releases ?? []).map((r) => ({
        value: String(r.id),
        label: `${r.name} (${r.version})`,
        sublabel: r.status,
        title: r.name,
      })),
      isFetching: releasesFetching,
    };
  }

  return { options: [], isFetching: false };
}

export function RequestApprovalSheet({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  projectId,
  currentUserId,
  defaultEntityType,
}: RequestApprovalSheetProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      entityType: defaultEntityType ?? "task",
      entityId: "",
      title: "",
      approverId: "",
      reason: "",
      dueAt: "",
      level: "",
    },
  });

  const entityType = form.watch("entityType");
  const entityId = form.watch("entityId");

  const { options: entityOptions, isFetching: entityFetching } = useEntityItems(projectId, entityType);

  useEffect(() => {
    form.setValue("entityId", "");
    form.setValue("title", "");
  }, [entityType, form]);

  useEffect(() => {
    if (!entityId) return;
    const item = entityOptions.find((o) => o.value === entityId);
    if (!item) return;
    const entityTypeLabels: Record<ApprovalEntityType, string> = {
      task: "Approve task",
      milestone: "Approve milestone",
      budget: "Approve budget",
      release: "Approve release",
      change_request: "Approve change request",
      document: "Approve document",
      timesheet: "Approve timesheet",
      client_approval: "Approve client request",
    };
    const prefix = entityTypeLabels[entityType] ?? "Approve";
    form.setValue("title", `${prefix}: ${item.title}`);
  }, [entityId, entityOptions, entityType, form]);

  function handleSubmit(values: FormValues) {
    const input: CreateApprovalInput = {
      entityType: values.entityType,
      entityId: parseInt(values.entityId, 10),
      title: values.title.trim(),
      approverId: values.approverId,
      ...(values.reason?.trim() ? { reason: values.reason.trim() } : {}),
      ...(values.dueAt ? { dueAt: values.dueAt } : {}),
      ...(values.level ? { level: parseInt(values.level, 10) } : {}),
    };
    onSubmit(input);
  }

  function handleOpenChange(next: boolean) {
    if (!next) form.reset({ entityType: defaultEntityType ?? "task", entityId: "", title: "", approverId: "", reason: "", dueAt: "", level: "" });
    onOpenChange(next);
  }

  const showEntitySelector = ["task", "milestone", "release"].includes(entityType);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-md flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 py-4 border-b">
          <SheetTitle>Request Approval</SheetTitle>
          <SheetDescription>Submit an item for approval review.</SheetDescription>
        </SheetHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex flex-col flex-1 overflow-y-auto"
          >
            <div className="flex-1 px-6 py-5 space-y-4">
              <FormField
                control={form.control}
                name="entityType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entity Type</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {ENTITY_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {showEntitySelector && (
                <FormField
                  control={form.control}
                  name="entityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {entityType === "task" ? "Task" : entityType === "milestone" ? "Milestone" : "Release"}
                      </FormLabel>
                      <FormControl>
                        <Combobox
                          options={entityOptions}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={
                            entityFetching
                              ? "Loading…"
                              : `Search ${entityType === "task" ? "tasks" : entityType === "milestone" ? "milestones" : "releases"}…`
                          }
                          searchPlaceholder="Search by name…"
                          emptyText={entityFetching ? "Loading…" : "No items found."}
                          disabled={entityFetching}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {!showEntitySelector && (
                <FormField
                  control={form.control}
                  name="entityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Entity ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g. 42" inputMode="numeric" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Describe what needs approval" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="approverId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Approver</FormLabel>
                    <FormControl>
                      <UserCombobox
                        value={field.value}
                        onChange={field.onChange}
                        placeholder="Search for approver…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reason / Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Provide context: risk, deadline, decision needed…"
                        className="resize-none h-20 text-sm"
                        maxLength={2000}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dueAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Due Date (optional)</FormLabel>
                    <FormControl>
                      <DatePicker value={field.value ?? ""} onChange={field.onChange} placeholder="Pick a date" className="h-8 text-sm" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="level"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Level (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. 1" inputMode="numeric" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <SheetFooter className="px-6 py-4 border-t shrink-0">
              <div className="grid w-full grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <LoadingButton type="submit" size="sm" isPending={isPending} loadingText="Submitting…">
                  Submit Request
                </LoadingButton>
              </div>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
