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
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
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
import type { ComboboxOption } from "@/components/ui/combobox";
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
  level: z.enum(["1", "2", "3"]),
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

interface EntityItem extends ComboboxOption {
  rawTitle: string;
}

function useEntityItems(projectId: number, entityType: ApprovalEntityType) {
  const { data: project } = useProject(projectId);
  const projectKey = project?.key ?? "";

  const { data: ticketsData, isFetching: ticketsFetching } = useTickets(projectId, { limit: 50 });
  const { data: milestones, isFetching: milestonesFetching } = useProjectMilestones(projectId);
  const { data: releases, isFetching: releasesFetching } = useReleases(projectId);

  if (entityType === "task") {
    const tickets = ticketsData?.data ?? [];
    return {
      items: tickets.map((t): EntityItem => ({
        value: String(t.id),
        label: projectKey ? `${projectKey}-${t.ticketNumber} · ${t.title}` : t.title,
        sublabel: t.status,
        rawTitle: t.title,
      })),
      isFetching: ticketsFetching,
    };
  }

  if (entityType === "milestone") {
    return {
      items: (milestones ?? []).map((m): EntityItem => ({
        value: String(m.id),
        label: m.name,
        sublabel: m.status,
        rawTitle: m.name,
      })),
      isFetching: milestonesFetching,
    };
  }

  if (entityType === "release") {
    return {
      items: (releases ?? []).map((r): EntityItem => ({
        value: String(r.id),
        label: `${r.name} (${r.version})`,
        sublabel: r.status,
        rawTitle: r.name,
      })),
      isFetching: releasesFetching,
    };
  }

  return { items: [] as EntityItem[], isFetching: false };
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
      level: "1",
    },
  });

  const entityType = form.watch("entityType");
  const entityId = form.watch("entityId");

  const { items: entityItems, isFetching: entityFetching } = useEntityItems(projectId, entityType);

  useEffect(() => {
    if (open) {
      form.reset({ entityType: defaultEntityType ?? "task", entityId: "", title: "", approverId: "", reason: "", dueAt: "", level: "1" });
    }
  }, [open, defaultEntityType, form]);

  useEffect(() => {
    form.setValue("entityId", "");
    form.setValue("title", "");
  }, [entityType, form]);

  useEffect(() => {
    if (!entityId) return;
    const item = entityItems.find((o) => o.value === entityId);
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
    form.setValue("title", `${prefix}: ${item.rawTitle}`);
  }, [entityId, entityItems, entityType, form]);

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
    if (!next) form.reset({ entityType: defaultEntityType ?? "task", entityId: "", title: "", approverId: "", reason: "", dueAt: "", level: "1" });
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
            className="flex flex-col flex-1 min-h-0"
          >
            <SheetBody className="px-6 py-5 space-y-4">
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
                          options={entityItems}
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
                        excludeUserId={currentUserId}
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
                    <FormLabel>Approval Level</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">Level 1 — Standard (team lead or peer review)</SelectItem>
                        <SelectItem value="2">Level 2 — Escalated (department manager)</SelectItem>
                        <SelectItem value="3">Level 3 — Executive (director or above)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-xs">
                      Higher levels route the approval to more senior stakeholders.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </SheetBody>
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
