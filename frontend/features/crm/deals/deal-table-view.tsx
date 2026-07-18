"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TruncatedText } from "@/components/ui/truncated-text";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";
import { formatDealId } from "@/lib/format-utils";
import { useCrmStages, resolveStage } from "@/hooks/api/crm/metadata";
import { CrmStageBadge } from "@/features/crm/shared/metadata";
import { AIPredictDealButton } from "./ai-predict-deal-button";

interface Deal {
  id: number;
  name: string;
  value?: string | null;
  stage: string;
  probability?: number | null;
  contactPerson?: string | null;
  contactEmail?: string | null;
  expectedCloseDate?: string | null;
  createdAt?: string | Date | null;
  assignedTo?: { id?: string; name?: string | null; image?: string | null } | null;
}

interface DealTableViewProps {
  deals: Deal[];
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (column: string) => void;
  onStageChange: (dealId: number, newStage: string) => void;
  isLoading: boolean;
}

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

function formatINR(val: string | number | null | undefined): string {
  if (!val) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num) || num === 0) return "—";
  if (num >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`;
  if (num >= 100000) return `₹${(num / 100000).toFixed(1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(0)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface DealNameButtonProps {
  dealId: number;
  name: string;
  onNavigate: (id: number) => void;
}

function DealNameButton({ dealId, name, onNavigate }: DealNameButtonProps) {
  const handleClick = useCallback(() => onNavigate(dealId), [dealId, onNavigate]);
  return (
    <button
      className="font-medium text-[12px] hover:text-primary hover:underline text-left block max-w-[160px]"
      onClick={handleClick}
    >
      <TruncatedText text={name} />
    </button>
  );
}

interface StageCellProps {
  deal: Pick<Deal, "id" | "stage">;
  isEditing: boolean;
  onStageChange: (dealId: number, stage: string) => void;
  onStartEdit: (dealId: number) => void;
}

function StageCell({ deal, isEditing, onStageChange, onStartEdit }: StageCellProps) {
  const { data: stages = [] } = useCrmStages("deal");
  const handleValueChange = useCallback((v: string) => onStageChange(deal.id, v), [deal.id, onStageChange]);
  const handleDoubleClick = useCallback(() => onStartEdit(deal.id), [deal.id, onStartEdit]);
  if (isEditing) {
    return (
      <Select defaultValue={deal.stage} onValueChange={handleValueChange}>
        <SelectTrigger className="h-6 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {stages.map(s => <SelectItem key={s.key} value={s.key} className="text-[11px]">{s.label}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  const stageObj = resolveStage(stages, deal.stage);
  return (
    <span onDoubleClick={handleDoubleClick} className="cursor-pointer">
      <CrmStageBadge stage={stageObj} size="table" />
    </span>
  );
}

export function DealTableView({
  deals, sortColumn, sortDirection, onSort, onStageChange, isLoading,
}: DealTableViewProps) {
  const router = useRouter();
  const [editingCell, setEditingCell] = useState<{ dealId: number; column: string } | null>(null);

  const handleNavigate = useCallback((id: number) => router.push(`/crm/deals/${id}`), [router]);
  const handleStageChange = useCallback((dealId: number, newStage: string) => {
    onStageChange(dealId, newStage);
    setEditingCell(null);
  }, [onStageChange]);
  const handleStartStageEdit = useCallback((dealId: number) => setEditingCell({ dealId, column: "stage" }), []);
  const handleRowClick = useCallback((row: Deal) => handleNavigate(row.id), [handleNavigate]);

  const columns: DataTableColumn<Deal>[] = [
    {
      key: "dealId",
      header: "Deal ID",
      cell: (row) => (
        <span className="font-mono text-[10px] text-muted-foreground select-all">
          {formatDealId(row.id)}
        </span>
      ),
    },
    {
      key: "name",
      header: "Deal Name",
      sortable: true,
      sortValue: (row) => row.name,
      cell: (row) => (
        <DealNameButton dealId={row.id} name={row.name} onNavigate={handleNavigate} />
      ),
    },
    {
      key: "value",
      header: "Value",
      sortable: true,
      sortValue: (row) => parseFloat(row.value ?? "0") || 0,
      cell: (row) => (
        <span className="font-mono tabular-nums text-primary font-semibold">
          {formatINR(row.value)}
        </span>
      ),
    },
    {
      key: "stage",
      header: "Stage",
      sortable: true,
      cell: (row) => (
        <StageCell
          deal={row}
          isEditing={editingCell?.dealId === row.id && editingCell?.column === "stage"}
          onStageChange={handleStageChange}
          onStartEdit={handleStartStageEdit}
        />
      ),
    },
    {
      key: "probability",
      header: "Prob%",
      sortable: true,
      sortValue: (row) => row.probability ?? 0,
      cell: (row) => (
        <span className="tabular-nums">
          {row.probability != null ? `${row.probability}%` : "—"}
        </span>
      ),
    },
    {
      key: "ai",
      header: "AI",
      cell: (row) => (
        <span onClick={stopPropagation}>
          <AIPredictDealButton dealId={row.id} compact />
        </span>
      ),
    },
    {
      key: "contactPerson",
      header: "Contact",
      className: "truncate max-w-[100px]",
      cell: (row) => row.contactPerson || "—",
    },
    {
      key: "assignedTo",
      header: "Assigned",
      cell: (row) => row.assignedTo?.name ? (
        <div className="flex items-center gap-1">
          <Avatar className="h-4 w-4">
            <AvatarImage src={row.assignedTo.image || ""} />
            <AvatarFallback className="text-[7px]">{row.assignedTo.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <TruncatedText text={row.assignedTo.name ?? "—"} className="max-w-[70px]" />
        </div>
      ) : <span className="text-muted-foreground/50">—</span>,
    },
    {
      key: "expectedCloseDate",
      header: "Close",
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">
          {row.expectedCloseDate ? formatDate(row.expectedCloseDate) : "—"}
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      sortValue: (row) => new Date(row.createdAt ?? 0).getTime(),
      cell: (row) => (
        <span className="text-muted-foreground tabular-nums">{timeAgo(row.createdAt)}</span>
      ),
    },
  ];

  const emptyState = (
    <div className="flex flex-col items-center justify-center min-h-[40dvh] text-center py-12 px-6">
      <p className="text-sm font-semibold text-foreground">No deals found</p>
      <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or create a new deal.</p>
    </div>
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="shrink-0 flex items-center px-1 pb-1.5">
        <span className="text-[11px] text-muted-foreground tabular-nums">{deals.length} deals</span>
      </div>
      <DataTable
        data={deals}
        columns={columns}
        getRowKey={(row) => row.id}
        onRowClick={handleRowClick}
        sortState={{ field: sortColumn, direction: sortDirection, onChange: (field) => onSort(field) }}
        isLoading={isLoading}
        emptyState={emptyState}
        minWidth="max-content"
        className="flex-1 min-h-0"
      />
    </div>
  );
}
