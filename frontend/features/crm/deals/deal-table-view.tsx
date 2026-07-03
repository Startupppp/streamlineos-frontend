"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDealId } from "@/lib/format-utils";
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

const STAGES = ["LEAD", "CONTACTED", "PROPOSAL", "NEGOTIATION", "WON", "LOST"];

const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

const STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-blue-50 text-blue-700 border-blue-200",
  CONTACTED: "bg-sky-50 text-sky-700 border-sky-200",
  PROPOSAL: "bg-amber-50 text-amber-700 border-amber-200",
  NEGOTIATION: "bg-violet-50 text-violet-700 border-violet-200",
  WON: "bg-emerald-50 text-emerald-700 border-emerald-200",
  LOST: "bg-red-50 text-red-700 border-red-200",
};

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

interface SortIconProps {
  column: string;
  sortColumn: string;
  sortDirection: "asc" | "desc";
}

function SortIcon({ column, sortColumn, sortDirection }: SortIconProps) {
  if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
  return sortDirection === "asc"
    ? <ArrowUp className="h-3 w-3 ml-1 text-blue-600" />
    : <ArrowDown className="h-3 w-3 ml-1 text-blue-600" />;
}

interface SortableHeadProps {
  col: { key: string; label: string; sortable: boolean };
  sortColumn: string;
  sortDirection: "asc" | "desc";
  onSort: (key: string) => void;
}

function SortableHead({ col, sortColumn, sortDirection, onSort }: SortableHeadProps) {
  const handleClick = useCallback(() => { if (col.sortable) onSort(col.key); }, [col.key, col.sortable, onSort]);
  return (
    <TableHead
      className={cn(
        "text-[10px] uppercase tracking-wider font-bold px-2 py-1.5 whitespace-nowrap",
        col.sortable && "cursor-pointer select-none hover:text-foreground",
      )}
      onClick={handleClick}
    >
      <span className="flex items-center">
        {col.label}
        {col.sortable && <SortIcon column={col.key} sortColumn={sortColumn} sortDirection={sortDirection} />}
      </span>
    </TableHead>
  );
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
      className="font-medium text-[12px] hover:text-blue-600 hover:underline text-left truncate max-w-[160px] block"
      onClick={handleClick}
    >
      {name}
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
  const handleValueChange = useCallback((v: string) => onStageChange(deal.id, v), [deal.id, onStageChange]);
  const handleDoubleClick = useCallback(() => onStartEdit(deal.id), [deal.id, onStartEdit]);
  if (isEditing) {
    return (
      <Select defaultValue={deal.stage} onValueChange={handleValueChange}>
        <SelectTrigger className="h-6 text-[10px] w-[100px]"><SelectValue /></SelectTrigger>
        <SelectContent>
          {STAGES.map(s => <SelectItem key={s} value={s} className="text-[11px]">{s}</SelectItem>)}
        </SelectContent>
      </Select>
    );
  }
  return (
    <Badge
      variant="outline"
      className={cn("text-[9px] px-1.5 py-0 h-4 cursor-pointer border font-medium", STAGE_COLORS[deal.stage])}
      onDoubleClick={handleDoubleClick}
    >
      {deal.stage}
    </Badge>
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

  const columns = [
    { key: "dealId", label: "Deal ID", sortable: false },
    { key: "name", label: "Deal Name", sortable: true },
    { key: "value", label: "Value", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "probability", label: "Prob%", sortable: true },
    { key: "ai", label: "AI", sortable: false },
    { key: "contactPerson", label: "Contact", sortable: false },
    { key: "assignedTo", label: "Assigned", sortable: false },
    { key: "expectedCloseDate", label: "Close", sortable: false },
    { key: "createdAt", label: "Created", sortable: true },
  ];

  return (
    <div className="flex flex-col h-[calc(100dvh-18rem)] min-h-[320px]">
      <div className="shrink-0 flex items-center px-1 pb-1.5">
        <span className="text-[11px] text-muted-foreground tabular-nums">{deals.length} deals</span>
      </div>

      <div className="flex-1 min-h-0 rounded-lg border border-border overflow-hidden overflow-auto">
        <div className="min-w-max">
          <table className="w-full caption-bottom text-[11px]">
            <TableHeader className="sticky top-0 z-10 bg-muted/80 backdrop-blur-sm">
              <TableRow className="border-b-2 border-border hover:bg-transparent">
                {columns.map(col => (
                  <SortableHead
                    key={col.key}
                    col={col}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={onSort}
                  />
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length} className="h-7 px-2">
                      <div className="h-3 w-full bg-muted/50 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="p-0 border-0">
                    <div className="flex flex-col items-center justify-center min-h-[40vh] text-center py-12 px-6">
                      <p className="text-sm font-semibold text-foreground">No deals found</p>
                      <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or create a new deal.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal, idx) => {
                  const isEditingStage = editingCell?.dealId === deal.id && editingCell?.column === "stage";
                  return (
                    <TableRow
                      key={deal.id}
                      className={cn("h-8", idx % 2 === 1 && "bg-muted/10", "hover:bg-muted/30 transition-colors")}
                    >
                      <TableCell className="px-2 py-1">
                        <span className="font-mono text-[10px] text-muted-foreground select-all">
                          {formatDealId(deal.id)}
                        </span>
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <DealNameButton dealId={deal.id} name={deal.name} onNavigate={handleNavigate} />
                      </TableCell>
                      <TableCell className="px-2 py-1 font-mono tabular-nums text-blue-600 font-semibold">
                        {formatINR(deal.value)}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        <StageCell
                          deal={deal}
                          isEditing={isEditingStage}
                          onStageChange={handleStageChange}
                          onStartEdit={handleStartStageEdit}
                        />
                      </TableCell>
                      <TableCell className="px-2 py-1 tabular-nums">
                        {deal.probability != null ? `${deal.probability}%` : "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1" onClick={stopPropagation}>
                        <AIPredictDealButton dealId={deal.id} compact />
                      </TableCell>
                      <TableCell className="px-2 py-1 truncate max-w-[100px]">
                        {deal.contactPerson || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1">
                        {deal.assignedTo?.name ? (
                          <div className="flex items-center gap-1">
                            <Avatar className="h-4 w-4">
                              <AvatarImage src={deal.assignedTo.image || ""} />
                              <AvatarFallback className="text-[7px]">{deal.assignedTo.name.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <span className="truncate max-w-[70px]">{deal.assignedTo.name}</span>
                          </div>
                        ) : <span className="text-muted-foreground/50">—</span>}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-muted-foreground tabular-nums">
                        {deal.expectedCloseDate ? formatDate(deal.expectedCloseDate) : "—"}
                      </TableCell>
                      <TableCell className="px-2 py-1 text-muted-foreground tabular-nums">
                        {timeAgo(deal.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </table>
        </div>
      </div>
    </div>
  );
}
