"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Types ─── */
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

const STAGE_COLORS: Record<string, string> = {
  LEAD: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  CONTACTED: "bg-sky-500/10 text-sky-400 border-sky-500/20",
  PROPOSAL: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  NEGOTIATION: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  WON: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  LOST: "bg-red-500/10 text-red-400 border-red-500/20",
};

function formatINR(val: string | number | null | undefined): string {
  if (!val) return "—";
  const num = typeof val === "string" ? parseFloat(val) : val;
  if (isNaN(num)) return "—";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = new Date(date);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function DealTableView({
  deals, sortColumn, sortDirection, onSort, onStageChange, isLoading,
}: DealTableViewProps) {
  const router = useRouter();
  const [editingCell, setEditingCell] = useState<{ dealId: number; column: string } | null>(null);

  const columns = [
    { key: "name", label: "Deal Name", sortable: true },
    { key: "value", label: "Value (INR)", sortable: true },
    { key: "stage", label: "Stage", sortable: true },
    { key: "probability", label: "Probability", sortable: true },
    { key: "contactPerson", label: "Contact", sortable: false },
    { key: "assignedTo", label: "Assigned To", sortable: false },
    { key: "expectedCloseDate", label: "Expected Close", sortable: false },
    { key: "createdAt", label: "Created", sortable: true },
  ];

  function SortIcon({ column }: { column: string }) {
    if (sortColumn !== column) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-30" />;
    return sortDirection === "asc"
      ? <ArrowUp className="h-3 w-3 ml-1 text-gold" />
      : <ArrowDown className="h-3 w-3 ml-1 text-gold" />;
  }

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between px-1 pb-2">
        <span className="text-xs text-muted-foreground">{deals.length} deals</span>
      </div>

      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-muted/60">
              <TableRow className="hover:bg-muted/60">
                {columns.map(col => (
                  <TableHead
                    key={col.key}
                    className={cn("text-[11px] uppercase tracking-wider font-semibold px-3 py-2.5 whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:text-foreground"
                    )}
                    onClick={() => col.sortable && onSort(col.key)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      {col.sortable && <SortIcon column={col.key} />}
                    </span>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={columns.length} className="h-12">
                      <div className="h-4 w-full bg-muted/50 rounded animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : deals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                    No deals found
                  </TableCell>
                </TableRow>
              ) : (
                deals.map((deal, idx) => {
                  const isEditingStage = editingCell?.dealId === deal.id && editingCell?.column === "stage";
                  return (
                    <TableRow
                      key={deal.id}
                      className={cn(idx % 2 === 1 && "bg-muted/20", "hover:bg-muted/40 transition-colors")}
                    >
                      <TableCell className="px-3 py-2">
                        <button
                          className="font-medium text-sm hover:text-gold hover:underline text-left truncate max-w-[200px]"
                          onClick={() => router.push(`/crm/deals/${deal.id}`)}
                        >
                          {deal.name}
                        </button>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs font-mono">
                        {formatINR(deal.value)}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {isEditingStage ? (
                          <Select defaultValue={deal.stage} onValueChange={(v) => { onStageChange(deal.id, v); setEditingCell(null); }}>
                            <SelectTrigger className="h-7 text-xs w-[130px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {STAGES.map(s => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] cursor-pointer border", STAGE_COLORS[deal.stage])}
                            onDoubleClick={() => setEditingCell({ dealId: deal.id, column: "stage" })}
                          >
                            {deal.stage}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs">
                        {deal.probability != null ? `${deal.probability}%` : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs truncate max-w-[120px]">
                        {deal.contactPerson || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2">
                        {deal.assignedTo?.name ? (
                          <div className="flex items-center gap-1.5">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={deal.assignedTo.image || ""} />
                              <AvatarFallback className="text-[8px]">
                                {deal.assignedTo.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs truncate max-w-[90px]">{deal.assignedTo.name}</span>
                          </div>
                        ) : <span className="text-xs text-muted-foreground">Unassigned</span>}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                        {deal.expectedCloseDate || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-xs text-muted-foreground">
                        {timeAgo(deal.createdAt)}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
