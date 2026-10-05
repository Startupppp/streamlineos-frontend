"use client";

import { useState } from "react";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { BuildListToolbar } from "@/features/build/shared/build-list-toolbar";
import { BuildFilterSelect } from "@/features/build/shared/build-filter-select";
import { GOVERNANCE_QA_RUN_RESULTS } from "@/features/build/shared/build-list-fixtures";
import {
  GalleryCase,
  noop,
  GALLERY_STATIC_PAGINATION,
} from "@/features/build/shared/build-list-gallery-cases";
import { buildResultColumns } from "@/features/build/qa/runs/result-columns";
import { ResultRow } from "@/features/build/qa/runs/result-row";
import type { TestRunResult } from "@/types/projects";

const RESULT_STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "not_run", label: "Not Run" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "blocked", label: "Blocked" },
  { value: "skipped", label: "Skipped" },
];

export function QaRunExecutionCase() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filters = [
    {
      id: "status",
      label: "Status",
      active: statusFilter !== "all",
      control: (
        <BuildFilterSelect
          label="Status"
          value={statusFilter}
          onValueChange={setStatusFilter}
          options={RESULT_STATUS_OPTIONS}
        />
      ),
    },
  ];

  const columns = buildResultColumns({
    projectId: 1,
    canExecute: false,
    canCreateBug: false,
    onCreateBug: noop,
    onOpenNotes: noop,
  });

  function getRowKey(row: TestRunResult) {
    return row.id;
  }

  function renderMobileCard(row: TestRunResult) {
    return (
      <ResultRow
        result={row}
        projectId={1}
        canExecute={false}
        canCreateBug={false}
        onCreateBug={noop}
      />
    );
  }

  function handleClearAll() {
    setSearch("");
    setStatusFilter("all");
  }

  return (
    <GalleryCase id="qa-run-execution" title="QA run execution · result table + status filter">
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border px-4 py-2">
          <BuildListToolbar
            search={{
              value: search,
              onValueChange: setSearch,
              placeholder: "Search test cases…",
              label: "Search test cases",
            }}
            filters={filters}
            onClearAll={handleClearAll}
          />
        </div>
        <div className="flex min-h-0 flex-1 flex-col">
          <BuildListSurface<(typeof GOVERNANCE_QA_RUN_RESULTS)[number]>
            permission="build:qa:view"
            rows={GOVERNANCE_QA_RUN_RESULTS}
            columns={columns}
            isLoading={false}
            isError={false}
            getRowKey={getRowKey}
            mobileCard={renderMobileCard}
            minWidth="640px"
            pagination={GALLERY_STATIC_PAGINATION}
            empty={
              <EmptyState
                className={CONTENT_FILL_PANEL}
                illustrationPreset="documents"
                title="No test results"
              />
            }
          />
        </div>
      </div>
    </GalleryCase>
  );
}
