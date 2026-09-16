"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { Siren, Plus } from "lucide-react";
import { EllipsisIcon } from "@animateicons/react/lucide";
import { useAnimatedIcon } from "@/hooks/common/use-animated-icon";
import { toast } from "sonner";
import { useIncidents, useDeleteIncident } from "@/hooks/api/build/incidents";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/ui/search-input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IncidentSheet } from "./incident-sheet";
import { getSlaState } from "./sla";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/types/projects";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { FILTER_TOOLBAR_ROW } from "@/components/ui/content-fill-panel";
import { TABLE_TITLE_CELL } from "@/lib/text-overflow";
import { TruncatedText } from "@/components/ui/truncated-text";
import { getErrorMessage } from "@/lib/get-error-message";

/**
 * Two ladders, and both lost their orange rung: `high` and `investigating` were
 * orange before the migration, and with no orange status they collapsed onto
 * the amber below them. Everything else here means its status and keeps it.
 */
const SEVERITY_STYLES: Record<string, string> = {
  critical: "text-status-danger-ink border-status-danger-rule bg-status-danger-surface",
  high: "text-category-orange-ink border-category-orange-rule",
  medium: "text-status-warning-ink border-status-warning-rule",
  low: "text-muted-foreground border-border",
};

const STATUS_STYLES: Record<string, string> = {
  detected: "text-status-danger-ink border-status-danger-rule",
  investigating: "text-category-orange-ink border-category-orange-rule",
  mitigating: "text-status-warning-ink border-status-warning-rule",
  resolved: "text-status-success-ink border-status-success-rule",
  postmortem: "text-status-info-ink border-status-info-rule",
  closed: "text-muted-foreground border-border",
};

const STATUS_LABELS: Record<string, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

const SEVERITIES: IncidentSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: IncidentStatus[] = ["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"];

function IncidentRowActions({
  incident,
  onEdit,
  onDelete,
}: {
  incident: Incident;
  onEdit: (i: Incident) => void;
  onDelete: (i: Incident) => void;
}) {
  const { iconRef, hoverHandlers } = useAnimatedIcon();
  const handleEdit = useCallback(() => onEdit(incident), [incident, onEdit]);
  const handleDelete = useCallback(() => onDelete(incident), [incident, onDelete]);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-6 w-6" aria-label="Incident actions" {...hoverHandlers}>
          <EllipsisIcon ref={iconRef} size={14} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onSelect={handleEdit}>Edit</DropdownMenuItem>
        <DropdownMenuItem variant="destructive" onSelect={handleDelete}>Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface IncidentsPageProps { projectId: number }

export function IncidentsPage({ projectId }: IncidentsPageProps) {
  const canManage = useCan("build:incidents:manage");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);

  const filters = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
  };

  const { data: incidents, isLoading, isError, refetch } = useIncidents(projectId, filters);
  const { data: membersData } = useOrgMembers(1, 100);
  const deleteIncident = useDeleteIncident();
  const members = useMemo(() => membersData?.data ?? [], [membersData]);

  const all = useMemo(() => incidents ?? [], [incidents]);
  const filtered = useMemo(
    () => search ? all.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()) || `INC-${i.incidentNumber}`.toLowerCase().includes(search.toLowerCase())) : all,
    [all, search],
  );

  const openCount = all.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
  const slaBreachedCount = all.filter((i) => { const s = getSlaState(i); return s.responseBreached || s.resolutionBreached; }).length;
  const resolvedCount = all.filter((i) => i.status === "resolved" || i.status === "closed").length;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const filtersActive = !!(search || statusFilter !== "all" || severityFilter !== "all");

  const handleClearFilters = useCallback(() => {
    setSearch("");
    setStatusFilter("all");
    setSeverityFilter("all");
  }, []);

  const handleEdit = useCallback((inc: Incident) => { setEditIncident(inc); setSheetOpen(true); }, []);
  const handleNew = useCallback(() => { setEditIncident(null); setSheetOpen(true); }, []);
  const handleAlertOpenChange = useCallback((open: boolean) => { if (!open) setDeleteTarget(null); }, []);
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteIncident.mutate(
      { projectId, incidentId: deleteTarget.id },
      {
        onSuccess: () => { toast.success("Incident deleted"); setDeleteTarget(null); },
        onError: (error) => toast.error(getErrorMessage(error)),
      },
    );
  }, [deleteTarget, deleteIncident, projectId]);

  const columns = useMemo<DataTableColumn<Incident>[]>(() => [
    {
      key: "incidentNumber",
      header: "ID",
      cell: (row) => (
        <Link href={`/build/${projectId}/incidents/${row.id}`} className="text-dense font-mono text-primary hover:underline">
          INC-{row.incidentNumber}
        </Link>
      ),
      className: "w-[80px]",
    },
    {
      key: "title",
      header: "Title",
      className: TABLE_TITLE_CELL,
      cell: (row) => (
        <TruncatedText text={row.title} className="text-dense font-medium" />
      ),
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro capitalize ${SEVERITY_STYLES[row.severity]}`}>
          {row.severity}
        </Badge>
      ),
      className: "w-[90px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-micro ${STATUS_STYLES[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </Badge>
      ),
      className: "w-[110px]",
    },
    {
      key: "sla",
      header: "SLA",
      cell: (row) => {
        const state = getSlaState(row);
        if (state.label === "Met")
          return <Badge variant="outline" className="text-micro text-muted-foreground border-border">Met</Badge>;
        if (state.responseBreached || state.resolutionBreached)
          return <Badge variant="outline" className="text-micro text-status-danger-ink border-status-danger-rule bg-status-danger-surface">Breached</Badge>;
        return <Badge variant="outline" className="text-micro text-status-success-ink border-status-success-rule">On track</Badge>;
      },
      className: "w-[90px]",
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => {
        const member = members.find((m) => m.userId === row.ownerId);
        return <span className="text-dense text-muted-foreground">{member ? (member.name ?? member.email) : "—"}</span>;
      },
      className: "w-[120px]",
    },
    {
      key: "detectedAt",
      header: "Detected",
      cell: (row) => (
        <span className="text-dense text-muted-foreground">
          {row.detectedAt ? new Date(row.detectedAt).toLocaleDateString() : "—"}
        </span>
      ),
      className: "w-[100px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => canManage ? (
        <IncidentRowActions incident={row} onEdit={handleEdit} onDelete={setDeleteTarget} />
      ) : null,
      className: "w-[40px]",
    },
  ], [canManage, projectId, handleEdit, members]);

  const filtersBar = (
    <div className={FILTER_TOOLBAR_ROW}>
      <SearchInput
        placeholder="Search incidents..."
        value={search}
        onValueChange={setSearch}
      />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s}>
              {STATUS_LABELS[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={severityFilter} onValueChange={setSeverityFilter}>
        <SelectTrigger className="w-28">
          <SelectValue placeholder="Severity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          {SEVERITIES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      title="Incidents"
      subtitle="Track incidents and SLA compliance"
      filters={filtersBar}
      actions={
        canManage ? (
          <Button size="sm" className="text-dense" onClick={handleNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Incident
          </Button>
        ) : undefined
      }
    >
      <PmPageShell>
        <PmSection index={0} className="shrink-0">
          <StatCardGrid cols={3}>
            <StatCard label="Open" value={openCount} icon={Siren} tone="amber" isLoading={isLoading} />
            <StatCard label="SLA Breached" value={slaBreachedCount} tone="red" isLoading={isLoading} />
            <StatCard label="Resolved" value={resolvedCount} tone="emerald" isLoading={isLoading} />
          </StatCardGrid>
        </PmSection>

        <PmSection index={1} className="flex min-h-0 flex-1 flex-col">
          {isLoading ? (
            <DataTableSkeleton rows={12} columns={7} className="flex-1" />
          ) : isError ? (
            <ErrorState className={PM_FILL_PANEL} onRetry={handleRetry} />
          ) : filtered.length === 0 ? (
            <EmptyState
              className={PM_FILL_PANEL}
              illustrationPreset="ticket"
              title="No incidents found"
              description={filtersActive ? undefined : "Create an incident to start tracking."}
              filtersActive={filtersActive}
              onClearFilters={handleClearFilters}
              action={canManage && !filtersActive ? { label: "New Incident", onClick: handleNew } : undefined}
            />
          ) : (
            <DataTable<Incident>
              data={filtered}
              columns={columns}
              getRowKey={(row) => row.id}
              className={PM_FILL_PANEL}
            />
          )}
        </PmSection>
      </PmPageShell>

      <IncidentSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editIncident={editIncident}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={handleAlertOpenChange}
        title="Delete incident?"
        description={`INC-${deleteTarget?.incidentNumber ?? ""} will be permanently deleted.`}
        confirmLabel="Delete"
        destructive
        onConfirm={handleDeleteConfirm}
      />
    </PageWrapper>
  );
}
