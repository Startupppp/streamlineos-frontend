"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { DataTableSkeleton } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { NamedUser } from "@/lib/person-display";
import type { Risk, Decision, Approval, ApprovalStatus } from "@/types/projects";
import type { Incident } from "@/hooks/api/build/incidents-schema";
import { createAppQueryClient } from "@/components/providers/query-provider";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  GALLERY_STUB_ACCESS,
  GOVERNANCE_RISK_ROWS,
  GOVERNANCE_INCIDENT_ROWS,
  GOVERNANCE_INCIDENT_MEMBERS,
  GOVERNANCE_DECISION_ROWS,
  GOVERNANCE_APPROVAL_ROWS,
} from "@/features/build/shared/build-list-fixtures";
import {
  GalleryCase,
  GalleryList,
  ONE_ACTION,
  TWO_ACTIONS,
  noop,
  GALLERY_STATIC_PAGINATION,
} from "@/features/build/shared/build-list-gallery-cases";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { ApprovalStatusBadge, entityTypeLabel } from "@/features/build/approvals/approval-status-badge";
import {
  buildRiskColumns,
  RiskMobileCard,
  RISK_TABLE_HEADERS,
} from "./risks-table-columns";
import {
  buildDecisionColumns,
  DecisionMobileCard,
  DECISION_TABLE_HEADERS,
} from "./decisions-table-columns";
import {
  buildIncidentsColumns,
  IncidentMobileCard,
  INCIDENTS_TABLE_HEADERS,
} from "@/features/build/incidents/incidents-table-columns";
import {
  useApprovalsColumns,
  APPROVALS_TABLE_HEADERS,
} from "@/features/build/approvals/use-approvals-columns";

const OWNERS: Record<string, NamedUser> = {
  user_priya: { firstName: "Priya", lastName: "Nair" },
  user_daniel: { firstName: "Daniel", lastName: "Okafor" },
};

function ownerOf(userId: string | null): NamedUser | null {
  return userId ? (OWNERS[userId] ?? null) : null;
}

function memberName(userId: string | null): string {
  const owner = ownerOf(userId);
  if (!owner) return "Unassigned";
  return `${owner.firstName ?? ""} ${owner.lastName ?? ""}`.trim();
}

const APPROVAL_STATUS_VALUES: ApprovalStatus[] = [
  "requested", "pending", "approved", "rejected", "changes_requested", "escalated", "cancelled",
];

function toApprovalStatus(s: string): ApprovalStatus {
  return APPROVAL_STATUS_VALUES.find((v) => v === s) ?? "pending";
}

function RisksTable() {
  const columns = buildRiskColumns({
    canManage: true,
    memberName,
    ownerOf,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Risk) {
    return row.id;
  }

  function renderMobileCard(row: Risk) {
    return (
      <RiskMobileCard
        risk={row}
        canManage
        ownerOf={ownerOf}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <BuildListSurface<Risk>
      permission="build:risks:view"
      rows={GOVERNANCE_RISK_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="720px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="documents"
          title="No risks recorded"
        />
      }
    />
  );
}

function IncidentsTable() {
  const columns = buildIncidentsColumns({
    canManage: true,
    members: GOVERNANCE_INCIDENT_MEMBERS,
    projectId: 1,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Incident) {
    return row.id;
  }

  function renderMobileCard(row: Incident) {
    return (
      <IncidentMobileCard
        incident={row}
        canManage
        members={GOVERNANCE_INCIDENT_MEMBERS}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <BuildListSurface<Incident>
      permission="build:incidents:view"
      rows={GOVERNANCE_INCIDENT_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="760px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="documents"
          title="No incidents"
        />
      }
    />
  );
}

function DecisionsTable() {
  const columns = buildDecisionColumns({
    canManage: true,
    memberName,
    ownerOf,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Decision) {
    return row.id;
  }

  function renderMobileCard(row: Decision) {
    return (
      <DecisionMobileCard
        decision={row}
        canManage
        ownerOf={ownerOf}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  return (
    <BuildListSurface<Decision>
      permission="build:decisions:view"
      rows={GOVERNANCE_DECISION_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="720px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="documents"
          title="No decisions recorded"
        />
      }
    />
  );
}

function ApprovalsTable() {
  const columns = useApprovalsColumns({
    canDecide: true,
    canManage: true,
    memberName,
    setDecideTarget: noop,
    setDelegateTarget: noop,
    handleEscalate: noop,
    setCancelTarget: noop,
    setDeleteTarget: noop,
  });

  function getRowKey(row: Approval) {
    return row.id;
  }

  function renderMobileCard(row: Approval) {
    return (
      <BuildMobileCard
        title={row.title}
        status={<ApprovalStatusBadge status={toApprovalStatus(row.status)} />}
        person={{ user: ownerOf(row.requestedById), role: "Requester" }}
        meta={[
          { label: "Type", value: entityTypeLabel(row.entityType) },
          { label: "Due", value: row.dueAt ? row.dueAt.slice(0, 10) : "—" },
        ]}
      />
    );
  }

  return (
    <BuildListSurface<Approval>
      permission="build:approvals:view"
      rows={GOVERNANCE_APPROVAL_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={getRowKey}
      mobileCard={renderMobileCard}
      minWidth="720px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={
        <EmptyState
          className={CONTENT_FILL_PANEL}
          illustrationPreset="documents"
          title="No approvals"
        />
      }
    />
  );
}

function RisksWithSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const columns = buildRiskColumns({
    canManage: true,
    memberName,
    ownerOf,
    onEdit: noop,
    onDelete: noop,
  });

  function getRowKey(row: Risk) {
    return row.id;
  }

  function renderMobileCard(row: Risk) {
    return (
      <RiskMobileCard
        risk={row}
        canManage
        ownerOf={ownerOf}
        onEdit={noop}
        onDelete={noop}
      />
    );
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm"
        >
          <Badge variant="secondary">{selectedIds.size} selected</Badge>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Clear selection"
            onClick={handleClearSelection}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      <BuildListSurface<Risk>
        permission="build:risks:view"
        rows={GOVERNANCE_RISK_ROWS}
        columns={columns}
        isLoading={false}
        isError={false}
        getRowKey={getRowKey}
        mobileCard={renderMobileCard}
        minWidth="720px"
        pagination={GALLERY_STATIC_PAGINATION}
        selection={{
          selected: selectedIds,
          onChange: setSelectedIds,
        }}
        empty={
          <EmptyState
            className={CONTENT_FILL_PANEL}
            illustrationPreset="documents"
            title="No risks recorded"
          />
        }
      />
    </div>
  );
}

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
          horizontal overflow, computed control heights, focus order, and ARIA structure.
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
