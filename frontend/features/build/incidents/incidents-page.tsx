"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, Siren } from "lucide-react";
import { toast } from "sonner";
import { useIncidents, useDeleteIncident } from "@/hooks/api/build/incidents";
import { useCan } from "@/hooks/api/access";
import { usePageState } from "@/hooks/api/use-page-state";
import { PageState } from "@/components/shared/page-state";
import { useOrgMembers } from "@/hooks/api/organization";
import { PageWrapper } from "@/components/ui/page-wrapper";
import { StatCard, StatCardGrid } from "@/components/ui/stat-card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { IncidentSheet } from "./incident-sheet";
import { getSlaState } from "./sla";
import type { Incident } from "@/hooks/api/build/incidents-schema";
import {
  PmPageShell,
  PmSection,
  PM_FILL_PANEL,
} from "@/components/pm-chrome";
import { getErrorMessage } from "@/lib/get-error-message";
import { BuildHeaderActions } from "@/features/build/shared/build-header-actions";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import {
  BUILD_FILTER_ALL,
  useBuildListFilters,
} from "@/features/build/shared/use-build-list-filters";
import {
  INCIDENTS_TABLE_HEADERS,
  IncidentMobileCard,
  buildIncidentsColumns,
} from "./incidents-table-columns";

const SEVERITY_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_OPTIONS = [
  { value: BUILD_FILTER_ALL, label: "All statuses" },
  { value: "detected", label: "Detected" },
  { value: "investigating", label: "Investigating" },
  { value: "mitigating", label: "Mitigating" },
  { value: "resolved", label: "Resolved" },
  { value: "postmortem", label: "Post-mortem" },
  { value: "closed", label: "Closed" },
];

const FILTER_DEFINITIONS = [
  { param: "status", options: ["detected", "investigating", "mitigating", "resolved", "postmortem", "closed"] as const },
  { param: "severity", options: ["critical", "high", "medium", "low"] as const },
] as const;

const INCIDENTS_LIST_CAP = 100;

interface IncidentsPageProps {
  projectId: number;
}

export function IncidentsPage({ projectId }: IncidentsPageProps) {
  const canManage = useCan("build:incidents:manage");

  const listFilters = useBuildListFilters({ filters: FILTER_DEFINITIONS });

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editIncident, setEditIncident] = useState<Incident | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Incident | null>(null);

  const statusValue = listFilters.value("status");
  const severityValue = listFilters.value("severity");

  const { data: incidents, isLoading, isError, error, refetch } = useIncidents(projectId, {
    status: statusValue !== BUILD_FILTER_ALL ? statusValue : undefined,
    severity: severityValue !== BUILD_FILTER_ALL ? severityValue : undefined,
  });

  const { data: membersData } = useOrgMembers(1, 100);
  const deleteIncident = useDeleteIncident();
  const pageState = usePageState({ permission: "build:incidents:view", isLoading, isError, error });
  const members = useMemo(() => membersData?.data ?? [], [membersData]);

  const all = useMemo(() => incidents ?? [], [incidents]);

  const displayed = useMemo(() => {
    const q = listFilters.debouncedSearch.trim().toLowerCase();
    if (!q) return all;
    return all.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        `inc-${i.incidentNumber}`.includes(q),
    );
  }, [all, listFilters.debouncedSearch]);

  const openCount = all.filter((i) => i.status !== "resolved" && i.status !== "closed").length;
  const slaBreachedCount = all.filter((i) => {
    const s = getSlaState(i);
    return s.responseBreached || s.resolutionBreached;
  }).length;
  const resolvedCount = all.filter(
    (i) => i.status === "resolved" || i.status === "closed",
  ).length;

  const handleRetry = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleEdit = useCallback((inc: Incident) => {
    setEditIncident(inc);
    setSheetOpen(true);
  }, []);

  const handleNew = useCallback(() => {
    setEditIncident(null);
    setSheetOpen(true);
  }, []);

  const handleAlertOpenChange = useCallback((open: boolean) => {
    if (!open) setDeleteTarget(null);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteIncident.mutate(
      { projectId, incidentId: deleteTarget.id },
      {
        onSuccess: () => {
          toast.success("Incident deleted");
          setDeleteTarget(null);
        },
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  }, [deleteTarget, deleteIncident, projectId]);

  const handleStatusChange = useCallback(
    (value: string) => listFilters.setValue("status", value),
    [listFilters],
  );

  const handleSeverityChange = useCallback(
    (value: string) => listFilters.setValue("severity", value),
    [listFilters],
  );

  const columns = useMemo(
    () =>
      buildIncidentsColumns({
        canManage,
        members,
        projectId,
        onEdit: handleEdit,
        onDelete: setDeleteTarget,
      }),
    [canManage, members, projectId, handleEdit],
  );

  const renderMobileCard = useCallback(
    (row: Incident) => (
      <IncidentMobileCard
        incident={row}
        canManage={canManage}
        members={members}
        onEdit={handleEdit}
        onDelete={setDeleteTarget}
      />
    ),
    [canManage, members, handleEdit],
  );

  return (
    <PageWrapper
      title="Incidents"
      subtitle="Track incidents and SLA compliance"
      filters={
        <BuildListToolbar
          search={{
            value: listFilters.search,
            onValueChange: listFilters.setSearch,
            placeholder: "Search incidents…",
            label: "Search incidents",
          }}
          filters={[
            {
              id: "status",
              label: "Status",
              active: listFilters.isActive("status"),
              control: (
                <BuildFilterSelect
                  label="Status"
                  value={statusValue}
                  onValueChange={handleStatusChange}
                  options={STATUS_OPTIONS}
                />
              ),
            },
            {
              id: "severity",
              label: "Severity",
              active: listFilters.isActive("severity"),
              control: (
                <BuildFilterSelect
                  label="Severity"
                  value={severityValue}
                  onValueChange={handleSeverityChange}
                  options={SEVERITY_OPTIONS}
                />
              ),
            },
          ]}
          onClearAll={listFilters.clearAll}
        />
      }
      actions={
        <BuildHeaderActions
          actions={
            canManage
              ? [
                  {
                    id: "new-incident",
                    label: "New Incident",
                    icon: Plus,
                    primary: true,
                    onSelect: handleNew,
                  },
                ]
              : []
          }
        />
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
          {!isLoading && !isError && all.length >= INCIDENTS_LIST_CAP ? (
            <p className="mb-2 shrink-0 text-micro text-muted-foreground">
              Showing the most recent {INCIDENTS_LIST_CAP} incidents. Narrow the status or
              severity filter to see more.
            </p>
          ) : null}
          <PageState
            resolution={pageState}
            loading={
              <DataTableSkeleton mobileCards
                rows={12}
                headers={INCIDENTS_TABLE_HEADERS}
                className="flex-1"
              />
            }
            empty={
              <EmptyState
                className={PM_FILL_PANEL}
                illustrationPreset="ticket"
                title="No incidents found"
                description="Create an incident to start tracking."
                filtersActive={listFilters.isFiltered}
                onClearFilters={listFilters.clearAll}
                action={canManage ? { label: "New Incident", onClick: handleNew } : undefined}
              />
            }
            onRetry={handleRetry}
            className={PM_FILL_PANEL}
          >
            <DataTable<Incident>
              data={displayed}
              columns={columns}
              getRowKey={(row) => row.id}
              className={PM_FILL_PANEL}
              mobileCard={renderMobileCard}
              pagination={{ pageSize: 25 }}
            />
          </PageState>
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
