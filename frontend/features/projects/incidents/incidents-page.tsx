"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { Siren, Plus, MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { useIncidents, useDeleteIncident } from "@/hooks/api/projects/incidents";
import { useCan } from "@/hooks/api/access";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable } from "@/components/ui/data-table";
import type { DataTableColumn } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { IncidentSheet } from "./incident-sheet";
import { getSlaState } from "./sla";
import type { Incident, IncidentSeverity, IncidentStatus } from "@/types/projects";

const SEVERITY_STYLES: Record<IncidentSeverity, string> = {
  critical: "text-red-700 border-red-300 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30",
  high: "text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/30",
  medium: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  low: "text-muted-foreground border-border",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  detected: "text-red-600 border-red-200 dark:text-red-400 dark:border-red-500/30",
  investigating: "text-orange-600 border-orange-200 dark:text-orange-400 dark:border-orange-500/30",
  mitigating: "text-amber-600 border-amber-200 dark:text-amber-400 dark:border-amber-500/30",
  resolved: "text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30",
  postmortem: "text-blue-600 border-blue-200 dark:text-blue-400 dark:border-blue-500/30",
  closed: "text-muted-foreground border-border",
};

const STATUS_LABELS: Record<IncidentStatus, string> = {
  detected: "Detected", investigating: "Investigating", mitigating: "Mitigating",
  resolved: "Resolved", postmortem: "Post-mortem", closed: "Closed",
};

const SEVERITIES: IncidentSeverity[] = ["critical", "high", "medium", "low"];
const STATUSES: IncidentStatus[] = ["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"];

interface IncidentsPageProps { projectId: number }

export function IncidentsPage({ projectId }: IncidentsPageProps) {
  const canManage = useCan("projects:incidents:manage");
  const prefersReduced = useReducedMotion();

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

  const handleEdit = useCallback((inc: Incident) => { setEditIncident(inc); setSheetOpen(true); }, []);
  const handleNew = useCallback(() => { setEditIncident(null); setSheetOpen(true); }, []);
  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteIncident.mutate(
      { projectId, id: deleteTarget.id },
      {
        onSuccess: () => { toast.success("Incident deleted"); setDeleteTarget(null); },
        onError: () => toast.error("Failed to delete incident"),
      },
    );
  }, [deleteTarget, deleteIncident, projectId]);

  const columns = useMemo<DataTableColumn<Incident>[]>(() => [
    {
      key: "incidentNumber",
      header: "ID",
      cell: (row) => (
        <Link href={`/projects/${projectId}/incidents/${row.id}`} className="text-[11px] font-mono text-primary hover:underline">
          INC-{row.incidentNumber}
        </Link>
      ),
      className: "w-[80px]",
    },
    {
      key: "title",
      header: "Title",
      cell: (row) => <span className="text-[11px] font-medium">{row.title}</span>,
    },
    {
      key: "severity",
      header: "Severity",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] capitalize ${SEVERITY_STYLES[row.severity]}`}>
          {row.severity}
        </Badge>
      ),
      className: "w-[90px]",
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => (
        <Badge variant="outline" className={`text-[10px] ${STATUS_STYLES[row.status]}`}>
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
          return <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">Met</Badge>;
        if (state.responseBreached || state.resolutionBreached)
          return <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/30">Breached</Badge>;
        return <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-200 dark:text-emerald-400 dark:border-emerald-500/30">On track</Badge>;
      },
      className: "w-[90px]",
    },
    {
      key: "owner",
      header: "Owner",
      cell: (row) => {
        const member = members.find((m) => m.userId === row.ownerId);
        return <span className="text-[11px] text-muted-foreground">{member ? (member.name ?? member.email) : "â€”"}</span>;
      },
      className: "w-[120px]",
    },
    {
      key: "detectedAt",
      header: "Detected",
      cell: (row) => (
        <span className="text-[11px] text-muted-foreground">
          {row.detectedAt ? new Date(row.detectedAt).toLocaleDateString() : "â€”"}
        </span>
      ),
      className: "w-[100px]",
    },
    {
      key: "actions",
      header: "",
      cell: (row) => canManage ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-6 w-6">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleEdit(row)}>Edit</DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleteTarget(row)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null,
      className: "w-[40px]",
    },
  ], [canManage, projectId, handleEdit, members]);

  const filtersBar = (
    <div className="flex items-center gap-2 flex-wrap w-full">
      <Input
        placeholder="Search incidents..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-7 text-[11px] w-44"
      />
      <Select value={statusFilter} onValueChange={setStatusFilter}>
        <SelectTrigger className="h-7 text-[11px] w-36"><SelectValue placeholder="Status" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All statuses</SelectItem>
          {STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
        </SelectContent>
      </Select>
      <Select value={severityFilter} onValueChange={setSeverityFilter}>
        <SelectTrigger className="h-7 text-[11px] w-28"><SelectValue placeholder="Severity" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          {SEVERITIES.map((s) => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <PageWrapper
      eyebrow="Project"
      title="Incidents"
      subtitle="Track incidents and SLA compliance"
      filters={filtersBar}
      actions={
        canManage ? (
          <Button size="sm" className="h-7 text-[11px]" onClick={handleNew}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            New Incident
          </Button>
        ) : undefined
      }
    >
      <div className="flex flex-1 min-h-0 flex-col space-y-4">
        <StatCardGrid cols={3}>
          <StatCard label="Open" value={openCount} icon={Siren} tone="amber" isLoading={isLoading} />
          <StatCard label="SLA Breached" value={slaBreachedCount} tone="red" isLoading={isLoading} />
          <StatCard label="Resolved" value={resolvedCount} tone="emerald" isLoading={isLoading} />
        </StatCardGrid>

        {isLoading ? (
          <DataTableSkeleton rows={8} columns={7} className="flex-1" />
        ) : isError ? (
          <ErrorState onRetry={refetch} />
        ) : filtered.length === 0 ? (
          <EmptyState
            illustrationPreset="ticket"
            title="No incidents found"
            description={search || statusFilter !== "all" || severityFilter !== "all" ? "No incidents match the active filters." : "Create an incident to start tracking."}
            action={canManage ? { label: "New Incident", onClick: handleNew } : undefined}
          />
        ) : (
          <motion.div
            initial={prefersReduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="flex flex-1 min-h-0 flex-col"
          >
            <DataTable<Incident> data={filtered} columns={columns} getRowKey={(row) => row.id} className="flex-1 min-h-0" />
          </motion.div>
        )}
      </div>

      <IncidentSheet
        projectId={projectId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        editIncident={editIncident}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete incident?</AlertDialogTitle>
            <AlertDialogDescription>
              INC-{deleteTarget?.incidentNumber} will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageWrapper>
  );
}
