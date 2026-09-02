"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EyeIcon } from "@animateicons/react/lucide";
import { getErrorMessage } from "@/lib/get-error-message";
import { useCan } from "@/hooks/api/access";
import {
  useReorgScenarios,
  useSimulateScenario,
  useDeleteReorgScenario,
  type ReorgScenario,
} from "../hooks/use-positions";

export function ReorgScenariosTab() {
  const canManage = useCan("hr:positions:manage");
  const [page, setPage] = useState(1);
  const [selectedScenarioId, setSelectedScenarioId] = useState<number | undefined>(undefined);

  const { data, isLoading, isError, error, refetch } = useReorgScenarios({ page, limit: 20 });
  const { data: simulation, isLoading: simLoading } = useSimulateScenario(selectedScenarioId);
  const deleteScenario = useDeleteReorgScenario();

  function handleSimulate(id: number) {
    setSelectedScenarioId(id);
  }

  function handleDelete(id: number) {
    deleteScenario.mutate(id);
  }

  function handleCloseSimulation() {
    setSelectedScenarioId(undefined);
  }

  function handleRetry() {
    void refetch();
  }

  const columns: DataTableColumn<ReorgScenario>[] = [
    {
      key: "name",
      header: "Scenario",
      cell: (row) => <span className="font-medium text-sm">{row.name}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row) => <Badge variant="outline">{row.status}</Badge>,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleSimulate(row.id)}>
            <EyeIcon size={14} className="mr-1" />
            Simulate
          </Button>
          {canManage && (
            <LoadingButton
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(row.id)}
              isPending={deleteScenario.isPending}
            >
              Delete
            </LoadingButton>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 min-h-0 flex-col gap-3">
        {Array.from({ length: 12 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorState
        className="flex-1"
        title="Couldn't load reorg scenarios"
        description={getErrorMessage(error)}
        onRetry={handleRetry}
      />
    );
  }

  return (
    <>
      {selectedScenarioId && (
        <div className="mb-4 border border-primary/20 bg-primary/5 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-foreground">Simulation Preview</h3>
            <Button variant="ghost" size="sm" onClick={handleCloseSimulation} className="text-muted-foreground h-6 px-2">
              Close
            </Button>
          </div>
          {simLoading ? (
            <Skeleton className="h-16 w-full rounded" />
          ) : simulation ? (
            <div className="space-y-2 text-sm text-foreground">
              <p className="font-medium">{simulation.scenarioName}</p>
              <p>Affected positions: <strong>{simulation.projectedEffect.affectedPositions}</strong></p>
              <p>Affected reporting lines: <strong>{simulation.projectedEffect.affectedReportingLines}</strong></p>
              <p className="text-xs text-muted-foreground mt-2 italic">{simulation.warning}</p>
            </div>
          ) : null}
        </div>
      )}
      <DataTable
        className="flex-1 min-h-0"
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <EmptyState
            illustrationPreset="projects"
            title="No reorg scenarios yet"
            description="Create a scenario to model org changes without affecting live positions."
            compact
          />
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
    </>
  );
}
