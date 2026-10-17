"use client";

import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import {
  GalleryList,
  ONE_ACTION,
} from "@/features/build/shared/build-list-gallery-cases";
import { GALLERY_STUB_ACCESS } from "@/features/build/shared/build-list-fixtures";
import {
  RISK_TABLE_HEADERS,
} from "./risks-table-columns";
import {
  DECISION_TABLE_HEADERS,
} from "./decisions-table-columns";
import {
  INCIDENTS_TABLE_HEADERS,
} from "@/features/build/incidents/incidents-table-columns";
import {
  APPROVALS_TABLE_HEADERS,
} from "@/features/build/approvals/use-approvals-columns";
import {
  RisksTable,
  IncidentsTable,
  DecisionsTable,
  ApprovalsTable,
  RisksWithSelection,
} from "./governance-qa-tables";

export function GovernanceQaGallery() {
  const [queryClient] = useState(() => {
    const client = createAppQueryClient("governance-qa-gallery");
    client.setQueryData(platformCoreQueryKeys.access.me(), GALLERY_STUB_ACCESS);
    return client;
  });
  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex flex-col gap-8 p-4">
        <header>
          <h1 className="text-lg font-semibold tracking-tight">
            Governance &amp; QA surfaces
          </h1>
          <p className="mt-1 text-label text-muted-foreground">
            Browser-verifiable layout facts for Governance and QA list surfaces:
            horizontal overflow, computed control heights, focus order, and ARIA
            structure.
          </p>
        </header>

        <GalleryList
          caseId="governance-risks"
          title="Risks list · status filter"
          actions={ONE_ACTION}
          filterCount={2}
          body={<RisksTable />}
        />
        <GalleryList
          caseId="incidents"
          title="Incidents list · severity + status filters"
          actions={ONE_ACTION}
          filterCount={2}
          body={<IncidentsTable />}
        />
        <GalleryList
          caseId="decisions"
          title="Decisions log · status filter"
          actions={ONE_ACTION}
          filterCount={1}
          body={<DecisionsTable />}
        />
        <GalleryList
          caseId="approvals"
          title="Approvals · status + entity type filters"
          actions={ONE_ACTION}
          filterCount={2}
          body={<ApprovalsTable />}
        />
        <GalleryList
          caseId="risks-with-selection"
          title="Risks list · keyboard selection"
          actions={ONE_ACTION}
          filterCount={2}
          body={<RisksWithSelection />}
        />
        <GalleryList
          caseId="loading-governance"
          title="Loading — governance list"
          actions={ONE_ACTION}
          filterCount={2}
          body={
            <DataTableSkeleton
              mobileCards
              rows={8}
              headers={[...RISK_TABLE_HEADERS]}
              className="flex-1"
            />
          }
        />
        <GalleryList
          caseId="loading-incidents"
          title="Loading — incidents"
          actions={ONE_ACTION}
          filterCount={2}
          body={
            <DataTableSkeleton
              mobileCards
              rows={8}
              headers={[...INCIDENTS_TABLE_HEADERS]}
              className="flex-1"
            />
          }
        />
        <GalleryList
          caseId="loading-decisions"
          title="Loading — decisions"
          actions={ONE_ACTION}
          filterCount={1}
          body={
            <DataTableSkeleton
              mobileCards
              rows={8}
              headers={[...DECISION_TABLE_HEADERS]}
              className="flex-1"
            />
          }
        />
        <GalleryList
          caseId="loading-approvals"
          title="Loading — approvals"
          actions={ONE_ACTION}
          filterCount={2}
          body={
            <DataTableSkeleton
              mobileCards
              rows={8}
              headers={[...APPROVALS_TABLE_HEADERS]}
              className="flex-1"
            />
          }
        />
        <GalleryList
          caseId="empty-governance"
          title="True empty — no risks"
          actions={ONE_ACTION}
          filterCount={2}
          body={
            <EmptyState
              className={CONTENT_FILL_PANEL}
              illustrationPreset="documents"
              title="No risks recorded"
              description="Track project risks to stay ahead of blockers."
              action={{ label: "New Risk" }}
            />
          }
        />
        <GalleryList
          caseId="error-governance"
          title="Error state"
          actions={ONE_ACTION}
          filterCount={2}
          body={
            <ErrorState title="We could not load risks" className="flex-1" />
          }
        />
      </div>
    </QueryClientProvider>
  );
}
