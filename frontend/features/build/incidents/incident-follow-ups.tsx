"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { getErrorMessage } from "@/lib/get-error-message";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { useUpdateIncidentFollowUpAction } from "@/hooks/api/build/incidents";
import type { IncidentsAddFollowUpActionResponse } from "@/contracts/build-contracts.generated";
import type { IncidentFollowUpStatus } from "@/hooks/api/build/incidents-schema";
import type { ProjectMemberRecord } from "@/types/projects";
import { formatShortDate } from "@/lib/date-utils";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { IncidentFollowUpBulkBar } from "./incident-follow-up-bulk-bar";
import { EditFollowUpDialog, AddFollowUpForm } from "./incident-follow-up-form";
import {
  isIncidentFollowUpStatus,
  FOLLOW_UP_STATUS_LABELS,
  FOLLOW_UP_STATUS_STYLES,
  FOLLOW_UP_STATUSES,
  STATUS_FILTER_OPTIONS,
  STATUS_FILTER_DEFINITIONS,
  unresolvedFollowUpCount,
} from "./incident-follow-ups-model";

function FollowUpStatusCell({
  action,
  projectId,
  incidentId,
  canManage,
}: {
  action: IncidentsAddFollowUpActionResponse;
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
  action: IncidentsAddFollowUpActionResponse;
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
}): DataTableColumn<IncidentsAddFollowUpActionResponse>[] {
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

export function IncidentFollowUps({
  projectId,
  incidentId,
  actions,
  canManage,
  members,
}: {
  projectId: number;
  incidentId: number;
  actions: IncidentsAddFollowUpActionResponse[];
  canManage: boolean;
  members: ProjectMemberRecord[];
}) {
  const listFilters = useBuildListFilters({ filters: STATUS_FILTER_DEFINITIONS, withSearch: false });
  const [selectedIds, setSelectedIds] = useState(new Set<string | number>());
  const handleClearSelection = () => setSelectedIds(new Set());

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
        <p className="text-micro font-medium uppercase tracking-wider text-muted-foreground">
          Follow-up actions
        </p>
        {unresolved > 0 ? (
          <Badge variant="outline" className="text-micro text-status-warning-ink-strong border-status-warning-rule">
            {unresolved} unresolved
          </Badge>
        ) : null}
        <BuildFilterSelect
          label="Status"
          value={listFilters.value("followUpStatus")}
          options={STATUS_FILTER_OPTIONS}
          onValueChange={(v) => listFilters.setValue("followUpStatus", v)}
        />
      </div>

      {selectedIds.size > 0 ? (
        <IncidentFollowUpBulkBar
          projectId={projectId}
          incidentId={incidentId}
          selectedIds={selectedIds}
          onClear={handleClearSelection}
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
