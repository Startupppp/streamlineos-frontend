"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { RecordList } from "@/components/renderer/record-list";
import { CONTENT_FILL_PANEL } from "@/components/ui/content-fill-panel";
import { useOrgDisplay } from "@/hooks/api/org-display";
import type { DensityMode } from "@/lib/design-tokens";
import type { Lead, LeadPriority, PipelineStatus } from "@/types/leads";
import { toLeadRecords } from "./lead-record";
import { LeadRowControls } from "./lead-row-controls";
import type { TeamMember } from "./leads-types";
import { useLeadLayout } from "./use-lead-layout";

export interface LeadRecordTableProps {
  leads: Lead[];
  density: DensityMode;
  pageSize: number;
  selectedIds: Set<number>;
  onSelectionChange: (next: Set<number>) => void;
  canSelect: boolean;
  canUpdate: boolean;
  canAssign: boolean;
  teamMembers: TeamMember[];
  onStatusChange: (lead: Lead, status: PipelineStatus) => void;
  onPriorityChange: (leadId: number, priority: LeadPriority) => void;
  onAssign: (leadId: number, userId: string) => void;
}

/**
 * The rendered lead table, behind its own `next/dynamic` boundary.
 *
 * Everything the table alone needs lives here — the tenant layout, the record
 * projection and the row menu — so the route's first load carries the header,
 * the stats and the filters, and pays for the renderer only once there are rows
 * to render.
 */
export function LeadRecordTable({
  leads,
  density,
  pageSize,
  selectedIds,
  onSelectionChange,
  canSelect,
  canUpdate,
  canAssign,
  teamMembers,
  onStatusChange,
  onPriorityChange,
  onAssign,
}: LeadRecordTableProps) {
  const router = useRouter();
  const layout = useLeadLayout();
  const money = useOrgDisplay();

  const rows = useMemo(() => toLeadRecords(leads), [leads]);
  const leadById = useMemo(() => new Map(leads.map((lead) => [String(lead.id), lead])), [leads]);

  const selection = useMemo(
    () => ({
      selected: new Set<string | number>([...selectedIds].map(String)),
      onChange: (next: Set<string | number>) => onSelectionChange(new Set([...next].map(Number))),
    }),
    [selectedIds, onSelectionChange],
  );

  const handleRowClick = useCallback(
    (row: Record<string, unknown>) => router.push(`/crm/leads/${String(row.id)}`),
    [router],
  );

  const renderActions = useCallback(
    (row: Record<string, unknown>) => {
      const lead = leadById.get(String(row.id));
      if (!lead) return null;
      return (
        <LeadRowControls
          lead={lead}
          onStatusChange={onStatusChange}
          onPriorityChange={onPriorityChange}
          onAssign={onAssign}
          teamMembers={teamMembers}
          canUpdate={canUpdate}
          canAssign={canAssign}
        />
      );
    },
    [leadById, onStatusChange, onPriorityChange, onAssign, teamMembers, canUpdate, canAssign],
  );

  return (
    <RecordList
      layout={layout}
      rows={rows}
      getRowKey={(row) => String(row.id)}
      actions={canUpdate || canAssign ? renderActions : undefined}
      selection={canSelect ? selection : undefined}
      onRowClick={handleRowClick}
      density={density}
      money={money}
      minWidth="1280px"
      className={CONTENT_FILL_PANEL}
      pagination={{ pageSize }}
    />
  );
}
