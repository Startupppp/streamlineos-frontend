"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import type { TestCase } from "@/types/projects";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  GALLERY_STUB_ACCESS,
  GOVERNANCE_QA_ROWS,
} from "@/features/build/shared/build-list-fixtures";
import {
  buildTestCaseColumns,
  TestCaseMobileCard,
  TEST_CASE_TABLE_HEADERS,
} from "@/features/build/qa/test-case-columns";
import {
  GalleryList,
  ONE_ACTION,
  TWO_ACTIONS,
  noop,
  GALLERY_STATIC_PAGINATION,
} from "@/features/build/shared/build-list-gallery-cases";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { BudgetOverview } from "./qa-budget-overview";
import { IncidentDetailCase } from "./qa-incident-detail-case";
import { QaRunExecutionCase } from "./qa-run-execution-case";
import { ReportsTabsCase } from "./qa-reports-tabs-case";

function QaTestCasesTable() {
  const columns = buildTestCaseColumns({
    canManage: true,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: TestCase) {
    return row.id;
  }

  function renderMobileCard(row: TestCase) {
    return (
      <TestCaseMobileCard
        testCase={row}
        canManage
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <BuildListSurface<TestCase>
      permission="build:qa:view"
      rows={GOVERNANCE_QA_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="600px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="documents"
          title="No test cases"
        />
      }
    />
  );
}

export function QaExecutionGallery() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("qa-execution-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col gap-8 p-4">
        <header>
          <h1 className="text-lg font-semibold tracking-tight">
            QA execution &amp; project financials
          </h1>
          <p className="mt-1 text-label text-muted-foreground">
            Browser-verifiable layout facts for QA test case lists, run execution,
            incident SLA panels, budget overviews, and report tab navigation.
          </p>
        </header>

        <GalleryList
          caseId="qa-test-cases"
          title="QA test cases · suite + status filters"
          actions={TWO_ACTIONS}
          filterCount={2}
          body={<QaTestCasesTable />}
        />
        <GalleryList
          caseId="loading-qa"
          title="Loading — QA test cases"
          actions={ONE_ACTION}
          filterCount={2}
          body={
            <DataTableSkeleton
              mobileCards
              rows={8}
              headers={[...TEST_CASE_TABLE_HEADERS]}
              className="flex-1"
            />
          }
        />
        <BudgetOverview />
        <IncidentDetailCase />
        <QaRunExecutionCase />
        <ReportsTabsCase />
      </div>
    </QueryClientProvider>
  );
}
