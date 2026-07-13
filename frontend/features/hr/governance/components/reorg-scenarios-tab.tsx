"use client";

import { useState } from "react";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { GitBranch, Eye } from "lucide-react";
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

  const { data, isLoading } = useReorgScenarios({ page, limit: 20 });
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
            <Eye className="h-3.5 w-3.5 mr-1" />
            Simulate
          </Button>
          {canManage && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={() => handleDelete(row.id)}
              disabled={deleteScenario.isPending}
            >
              Delete
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <>
      {selectedScenarioId && (
        <div className="mb-4 border border-blue-200 bg-blue-50 rounded-lg p-4 dark:bg-blue-500/10 dark:border-blue-500/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-300">Simulation Preview</h3>
            <Button variant="ghost" size="sm" onClick={handleCloseSimulation} className="text-blue-700 dark:text-blue-300 h-6 px-2">
              Close
            </Button>
          </div>
          {simLoading ? (
            <Skeleton className="h-16 w-full rounded" />
          ) : simulation ? (
            <div className="space-y-2 text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium">{simulation.scenarioName}</p>
              <p>Affected positions: <strong>{simulation.projectedEffect.affectedPositions}</strong></p>
              <p>Affected reporting lines: <strong>{simulation.projectedEffect.affectedReportingLines}</strong></p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-2 italic">{simulation.warning}</p>
            </div>
          ) : null}
        </div>
      )}
      <DataTable
        columns={columns}
        data={data?.data ?? []}
        getRowKey={(row) => row.id}
        emptyState={
          <div className="flex flex-col items-center py-12">
            <GitBranch className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No reorg scenarios created yet.</p>
          </div>
        }
        pagination={{ mode: "server", page, pageSize: 20, total: data?.total ?? 0, onPageChange: setPage }}
      />
    </>
  );
}
