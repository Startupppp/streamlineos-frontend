"use client";

import { memo, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useRegisterDirtyState } from "@/components/shared/dirty-state-context";
import { getErrorMessage } from "@/lib/get-error-message";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import {
  useAddIncidentFollowUpAction,
  useUpdateIncidentFollowUpAction,
} from "@/hooks/api/build/incidents";
import {
  incidentFollowUpSchema,
  type IncidentFollowUpValues,
} from "@/features/build/incidents/incident-schema";
import type { IncidentFollowUpAction, IncidentFollowUpStatus } from "@/hooks/api/build/incidents-schema";
import type { ProjectMemberRecord } from "@/types/projects";
import { ProjectMemberSelect } from "@/components/members/project-member-select";
import { formatShortDate } from "@/lib/date-utils";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { IncidentFollowUpBulkBar } from "./incident-follow-up-bulk-bar";

function isIncidentFollowUpStatus(value: string): value is IncidentFollowUpStatus {
  return Object.hasOwn(FOLLOW_UP_STATUS_LABELS, value);
}

const FOLLOW_UP_STATUS_LABELS: Record<IncidentFollowUpStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  done: "Done",
  cancelled: "Cancelled",
};

const FOLLOW_UP_STATUS_STYLES: Record<IncidentFollowUpStatus, string> = {
  open: "text-status-danger-ink-strong border-status-danger-rule",
  in_progress: "text-status-warning-ink-strong border-status-warning-rule",
  done: "text-status-success-ink-strong border-status-success-rule",
  cancelled: "text-muted-foreground border-border",
};

const FOLLOW_UP_STATUSES: IncidentFollowUpStatus[] = [
  "open",
  "in_progress",
  "done",
  "cancelled",
];

const STATUS_FILTER_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_FILTER_DEFINITIONS = [
  { param: "followUpStatus", options: ["open", "in_progress", "done", "cancelled"] as const },
] as const;

export function unresolvedFollowUpCount(actions: IncidentFollowUpAction[]): number {
  return actions.filter((a) => a.status === "open" || a.status === "in_progress").length;
}

function FollowUpStatusCell({
  action,
  projectId,
  incidentId,
  canManage,
}: {
  action: IncidentFollowUpAction;
  projectId: number;
  incidentId: number;
  canManage: boolean;
}) {
  const updateAction = useUpdateIncidentFollowUpAction();

  function handleStatusChange(next: string) {
    if (!isIncidentFollowUpStatus(next)) return;
    updateAction.mutate(
      {
        projectId,
        incidentId,
        followUpActionId: action.id,
        status: next,
      },
      {
        onSuccess: () => toast.success("Follow-up updated"),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  if (!canManage) {
    return (
      <Badge variant="outline" className={`text-micro ${FOLLOW_UP_STATUS_STYLES[action.status]}`}>
        {FOLLOW_UP_STATUS_LABELS[action.status]}
      </Badge>
    );
  }

  return (
    <div className="w-32">
      <Select value={action.status} onValueChange={handleStatusChange}>
        <SelectTrigger aria-label={`Status for ${action.title}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FOLLOW_UP_STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {FOLLOW_UP_STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function FollowUpActionsCell({
  action,
  canManage,
  projectId,
  incidentId,
}: {
  action: IncidentFollowUpAction;
  canManage: boolean;
  projectId: number;
  incidentId: number;
}) {
  const [editOpen, setEditOpen] = useState(false);

  if (!canManage) return null;

  return (
    <>
      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label={`Edit ${action.title}`}
        title="Edit follow-up"
        onClick={() => setEditOpen(true)}
      >
        <Pencil className="size-3.5" />
      </Button>
      <EditFollowUpDialog
        projectId={projectId}
        incidentId={incidentId}
        action={action}
        open={editOpen}
        onOpenChange={setEditOpen}
      />
    </>
  );
}

function buildFollowUpColumns(options: {
  projectId: number;
  incidentId: number;
  canManage: boolean;
  members: ProjectMemberRecord[];
}): DataTableColumn<IncidentFollowUpAction>[] {
  const { projectId, incidentId, canManage, members } = options;
  return [
    {
      key: "title",
      header: "Action",
      cell: (row) => (
        <div className="min-w-0 space-y-0.5">
          <p className="text-xs text-foreground">{row.title}</p>
          {row.description ? (
            <p className="text-micro text-muted-foreground">{row.description}</p>
          ) : null}
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner",
      className: "w-[120px]",
      cell: (row) => {
        const owner = members.find((m) => m.id === row.ownerId);
        return (
          <span className="text-xs text-muted-foreground">
            {owner?.name ?? owner?.email ?? (row.ownerId ? "Former member" : "Unassigned")}
          </span>
        );
      },
    },
    {
      key: "dueAt",
      header: "Due",
      className: "w-[90px]",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.dueAt ? formatShortDate(row.dueAt) : "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[150px]",
      cell: (row) => (
        <FollowUpStatusCell
          action={row}
          projectId={projectId}
          incidentId={incidentId}
          canManage={canManage}
        />
      ),
    },
    {
      key: "actions",
      header: "Actions",
      headerClassName: "sr-only",
      className: "w-[40px]",
      cell: (row) => (
        <FollowUpActionsCell
          action={row}
          canManage={canManage}
          projectId={projectId}
          incidentId={incidentId}
        />
      ),
    },
  ];
}

function EditFollowUpDialog({
  projectId,
  incidentId,
  action,
  open,
  onOpenChange,
}: {
  projectId: number;
  incidentId: number;
  action: IncidentFollowUpAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const updateAction = useUpdateIncidentFollowUpAction();
  const form = useForm<IncidentFollowUpValues>({
    resolver: zodResolver(incidentFollowUpSchema),
    values: {
      title: action.title,
      description: action.description ?? "",
      ownerId: action.ownerId ?? "",
      dueAt: action.dueAt?.slice(0, 10) ?? "",
    },
  });
  useRegisterDirtyState(open && form.formState.isDirty);

  function handleSubmit(values: IncidentFollowUpValues) {
    updateAction.mutate(
      {
        projectId,
        incidentId,
        followUpActionId: action.id,
        title: values.title,
        description: values.description || null,
        ownerId: values.ownerId || null,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : null,
      },
      {
        onSuccess: () => {
          toast.success("Follow-up updated");
          onOpenChange(false);
        },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-3 p-4 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit follow-up</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-3">
            <FollowUpFields form={form} projectId={projectId} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <LoadingButton type="submit" isPending={updateAction.isPending} loadingText="Saving…">
                Save
              </LoadingButton>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function FollowUpFields({
  form,
  projectId,
  includeTitle = true,
}: {
  form: UseFormReturn<IncidentFollowUpValues>;
  projectId: number;
  includeTitle?: boolean;
}) {
  return (
    <>
      {includeTitle ? (
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Title</FormLabel>
              <FormControl>
                <Input {...field} className="text-dense" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      ) : null}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel className="text-dense">Description</FormLabel>
            <FormControl>
              <Textarea {...field} className="min-h-[72px] resize-none text-dense" />
            </FormControl>
            <FormMessage className="text-micro" />
          </FormItem>
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <FormField
          control={form.control}
          name="ownerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Owner</FormLabel>
              <ProjectMemberSelect
                projectId={projectId}
                mode="single"
                value={field.value}
                onChange={(value) => field.onChange(value ?? "")}
                allowUnassigned
                placeholder="Unassigned"
              />
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="dueAt"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">Due date</FormLabel>
              <FormControl>
                <Input {...field} type="date" className="text-dense" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}

function AddFollowUpForm({ projectId, incidentId }: { projectId: number; incidentId: number }) {
  const addAction = useAddIncidentFollowUpAction();
  const form = useForm<IncidentFollowUpValues>({
    resolver: zodResolver(incidentFollowUpSchema),
    defaultValues: { title: "", description: "", ownerId: "", dueAt: "" },
  });
  useRegisterDirtyState(form.formState.isDirty);

  function handleSubmit(values: IncidentFollowUpValues) {
    addAction.mutate(
      {
        projectId,
        incidentId,
        title: values.title,
        description: values.description || undefined,
        ownerId: values.ownerId || undefined,
        dueAt: values.dueAt ? new Date(values.dueAt).toISOString() : undefined,
      },
      {
        onSuccess: () => {
          toast.success("Follow-up added");
          form.reset({ title: "", description: "", ownerId: "", dueAt: "" });
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-2 border-t pt-3">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-dense">
                Add follow-up <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input {...field} placeholder="What must happen before this is done?" className="text-dense" />
              </FormControl>
              <FormMessage className="text-micro" />
            </FormItem>
          )}
        />
        <FollowUpFields form={form} projectId={projectId} includeTitle={false} />
        <div className="flex justify-end">
          <LoadingButton
            type="submit"
            size="sm"
            className="text-dense"
            isPending={addAction.isPending}
            loadingText="Adding…"
          >
            Add Follow-up
          </LoadingButton>
        </div>
      </form>
    </Form>
  );
}

export function IncidentFollowUps({
  projectId,
  incidentId,
  actions,
  canManage,
  members,
}: {
  projectId: number;
  incidentId: number;
  actions: IncidentFollowUpAction[];
  canManage: boolean;
  members: ProjectMemberRecord[];
}) {
  const listFilters = useBuildListFilters({ filters: STATUS_FILTER_DEFINITIONS, withSearch: false });
  const [selectedIds, setSelectedIds] = useState(new Set<string | number>());

  const filtered = useMemo(() => {
    const statusFilter = listFilters.value("followUpStatus");
    const sorted = [...actions].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    if (statusFilter === BUILD_FILTER_ALL) return sorted;
    return sorted.filter((a) => a.status === statusFilter);
  }, [actions, listFilters]);

  const unresolved = unresolvedFollowUpCount(actions);

  const columns = useMemo(
    () => buildFollowUpColumns({ projectId, incidentId, canManage, members }),
    [projectId, incidentId, canManage, members],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-micro font-semibold uppercase tracking-wider text-muted-foreground">
          Follow-up actions
        </p>
        {unresolved > 0 ? (
          <Badge variant="outline" className="text-micro text-status-warning-ink-strong border-status-warning-rule">
            {unresolved} unresolved
          </Badge>
        ) : null}
        <BuildFilterSelect
          filterId="followUpStatus"
          label="Status"
          value={listFilters.value("followUpStatus")}
          options={STATUS_FILTER_OPTIONS}
          isActive={listFilters.isActive("followUpStatus")}
          onChange={(v) => listFilters.setValue("followUpStatus", v)}
        />
      </div>

      {selectedIds.size > 0 ? (
        <IncidentFollowUpBulkBar
          projectId={projectId}
          incidentId={incidentId}
          selectedIds={selectedIds}
          onClear={() => setSelectedIds(new Set())}
        />
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-xs italic text-muted-foreground">
          {listFilters.isFiltered ? "No follow-up actions match the current filter." : "No follow-up actions yet."}
        </p>
      ) : (
        <DataTable
          data={filtered}
          columns={columns}
          getRowKey={(row) => row.id}
          selection={
            canManage
              ? {
                  selected: selectedIds,
                  onChange: setSelectedIds,
                  getRowLabel: (row) => row.title,
                }
              : undefined
          }
        />
      )}

      {canManage && <AddFollowUpForm projectId={projectId} incidentId={incidentId} />}
    </div>
  );
}
