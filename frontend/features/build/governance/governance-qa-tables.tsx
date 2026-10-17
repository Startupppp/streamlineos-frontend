"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { CONTENT_FILL_PANEL } from "@/components/pm-chrome";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { BuildApprovalsCreateApprovalResponse } from "@/contracts/build-contracts.generated";
import type { Risk, Decision } from "@/types/projects";
import type { IncidentsCreateIncidentResponse } from "@/contracts/build-contracts.generated";
import {
  ownerOf,
  memberName,
  approvalMemberName,
  toApprovalStatus,
} from "./governance-qa-helpers";
import { BuildListSurface } from "@/features/build/shared/build-list-surface";
import {
  GOVERNANCE_RISK_ROWS,
  GOVERNANCE_INCIDENT_ROWS,
  GOVERNANCE_INCIDENT_MEMBERS,
  GOVERNANCE_DECISION_ROWS,
  GOVERNANCE_APPROVAL_ROWS,
} from "@/features/build/shared/build-list-fixtures";
import {
  noop,
  GALLERY_STATIC_PAGINATION,
} from "@/features/build/shared/build-list-gallery-cases";
import { BuildMobileCard } from "@/features/build/shared/build-mobile-card";
import { ApprovalStatusBadge } from "@/features/build/approvals/approval-status-badge";
import { entityTypeLabel } from "@/features/build/approvals/approvals-constants";
import { buildRiskColumns, RiskMobileCard } from "./risks-table-columns";
import { buildDecisionColumns, DecisionMobileCard } from "./decisions-table-columns";
import { buildIncidentsColumns, IncidentMobileCard } from "@/features/build/incidents/incidents-table-columns";
import { useApprovalsColumns } from "@/features/build/approvals/use-approvals-columns";

const riskColumns = buildRiskColumns({ canManage: true, memberName, ownerOf, onEdit: noop, onDelete: noop });
const decisionColumns = buildDecisionColumns({ canManage: true, memberName, ownerOf, onEdit: noop, onDelete: noop });

export function RisksTable() {
  return (
    <BuildListSurface<Risk>
      permission="build:risks:view"
      rows={GOVERNANCE_RISK_ROWS}
      columns={riskColumns}
      isLoading={false}
      isError={false}
      getRowKey={(row) => row.id}
      mobileCard={(row) => (
        <RiskMobileCard risk={row} canManage ownerOf={ownerOf} onEdit={noop} onDelete={noop} />
      )}
      minWidth="720px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="documents" title="No risks recorded" />}
    />
  );
}

export function IncidentsTable() {
  const columns = buildIncidentsColumns({ canManage: true, members: GOVERNANCE_INCIDENT_MEMBERS, projectId: 1, onEdit: noop, onDelete: noop });
  return (
    <BuildListSurface<IncidentsCreateIncidentResponse>
      permission="build:incidents:view"
      rows={GOVERNANCE_INCIDENT_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={(row) => row.id}
      mobileCard={(row) => (
        <IncidentMobileCard incident={row} canManage members={GOVERNANCE_INCIDENT_MEMBERS} onEdit={noop} onDelete={noop} />
      )}
      minWidth="760px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="documents" title="No incidents" />}
    />
  );
}

export function DecisionsTable() {
  return (
    <BuildListSurface<Decision>
      permission="build:decisions:view"
      rows={GOVERNANCE_DECISION_ROWS}
      columns={decisionColumns}
      isLoading={false}
      isError={false}
      getRowKey={(row) => row.id}
      mobileCard={(row) => (
        <DecisionMobileCard decision={row} canManage ownerOf={ownerOf} onEdit={noop} onDelete={noop} />
      )}
      minWidth="720px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="documents" title="No decisions recorded" />}
    />
  );
}

export function ApprovalsTable() {
  const columns = useApprovalsColumns({
    canDecide: true,
    canManage: true,
    memberName: approvalMemberName,
    setDecideTarget: noop,
    setDelegateTarget: noop,
    handleEscalate: noop,
    setCancelTarget: noop,
    setDeleteTarget: noop,
  });
  return (
    <BuildListSurface<BuildApprovalsCreateApprovalResponse>
      permission="build:approvals:view"
      rows={GOVERNANCE_APPROVAL_ROWS}
      columns={columns}
      isLoading={false}
      isError={false}
      getRowKey={(row) => row.id}
      mobileCard={(row) => (
        <BuildMobileCard
          title={row.title}
          status={<ApprovalStatusBadge status={toApprovalStatus(row.status)} />}
          person={{ user: ownerOf(row.requestedById), role: "Requester" }}
          meta={[
            { label: "Type", value: entityTypeLabel(row.entityType) },
            { label: "Due", value: row.dueAt ? row.dueAt.slice(0, 10) : "—" },
          ]}
        />
      )}
      minWidth="720px"
      pagination={GALLERY_STATIC_PAGINATION}
      empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="documents" title="No approvals" />}
    />
  );
}

export function RisksWithSelection() {
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setSelectedIds(new Set());
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

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
            onClick={() => setSelectedIds(new Set())}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      )}
      <BuildListSurface<Risk>
        permission="build:risks:view"
        rows={GOVERNANCE_RISK_ROWS}
        columns={riskColumns}
        isLoading={false}
        isError={false}
        getRowKey={(row) => row.id}
        mobileCard={(row) => (
          <RiskMobileCard risk={row} canManage ownerOf={ownerOf} onEdit={noop} onDelete={noop} />
        )}
        minWidth="720px"
        pagination={GALLERY_STATIC_PAGINATION}
        selection={{ selected: selectedIds, onChange: setSelectedIds }}
        empty={<EmptyState className={CONTENT_FILL_PANEL} illustrationPreset="documents" title="No risks recorded" />}
      />
    </div>
  );
}
